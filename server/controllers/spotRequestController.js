import mongoose from 'mongoose';
import ParkingSpotRequest from '../models/ParkingSpotRequest.js';
import ParkingLot from '../models/ParkingLot.js';
import { createParkingSpot } from './parkingController.js';

const toTrimmedString = (value) => String(value || '').trim();

const createResCollector = () => {
  const result = {
    statusCode: 200,
    payload: null,
  };

  return {
    result,
    res: {
      status(code) {
        result.statusCode = code;
        return this;
      },
      json(payload) {
        result.payload = payload;
        return this;
      },
    },
  };
};

export const createSpotRequest = async (req, res) => {
  try {
    const parkingLotName = toTrimmedString(req.body.parkingLotName);
    const area = toTrimmedString(req.body.area || req.body.location);
    const floor = Number.parseInt(req.body.floor, 10);
    const numberOfSpots = Number.parseInt(req.body.numberOfSpots, 10);

    if (!parkingLotName) {
      return res.status(400).json({ message: 'parkingLotName is required' });
    }
    if (!area) {
      return res.status(400).json({ message: 'area is required' });
    }
    if (!Number.isInteger(floor) || floor < 0) {
      return res.status(400).json({ message: 'floor must be a non-negative integer' });
    }
    if (!Number.isInteger(numberOfSpots) || numberOfSpots < 1 || numberOfSpots > 100) {
      return res.status(400).json({ message: 'numberOfSpots must be between 1 and 100' });
    }

    const tags = Array.isArray(req.body.tags)
      ? req.body.tags.map((tag) => toTrimmedString(tag)).filter(Boolean)
      : [];

    const created = await ParkingSpotRequest.create({
      ownerId: req.user._id,
      parkingLotName,
      area,
      floor,
      vehicleType: req.body.vehicleType || 'All',
      pricePerHour: Number(req.body.pricePerHour) >= 0 ? Number(req.body.pricePerHour) : 50,
      tags,
      numberOfSpots,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Spot creation request sent to admin for approval',
      request: created,
    });
  } catch (error) {
    console.error('createSpotRequest error:', error);
    return res.status(500).json({ message: 'Server error while creating spot request' });
  }
};

export const getMySpotRequests = async (req, res) => {
  try {
    const requests = await ParkingSpotRequest.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ requests, count: requests.length });
  } catch (error) {
    console.error('getMySpotRequests error:', error);
    return res.status(500).json({ message: 'Server error while fetching owner requests' });
  }
};

export const getPendingSpotRequests = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = status === 'all' ? {} : { status };

    const requests = await ParkingSpotRequest.find(filter)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });

    return res.json({ requests, count: requests.length });
  } catch (error) {
    console.error('getPendingSpotRequests error:', error);
    return res.status(500).json({ message: 'Server error while fetching spot requests' });
  }
};

export const approveSpotRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const requestDoc = await ParkingSpotRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: 'Spot request not found' });
    }

    if (requestDoc.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${requestDoc.status}` });
    }

    const lotName = toTrimmedString(requestDoc.parkingLotName);
    const area = toTrimmedString(requestDoc.area);

    let lot = await ParkingLot.findOne({ name: lotName });
    let createdLot = false;

    if (!lot) {
      lot = await ParkingLot.create({
        name: lotName,
        address: area,
        location: area,
        latitude: 23.8103,
        longitude: 90.4125,
        ownerId: requestDoc.ownerId,
        status: 'approved',
      });
      createdLot = true;
    } else {
      let shouldSaveLot = false;
      if (!lot.ownerId) {
        lot.ownerId = requestDoc.ownerId;
        shouldSaveLot = true;
      }
      if (lot.status !== 'approved') {
        lot.status = 'approved';
        shouldSaveLot = true;
      }
      if (shouldSaveLot) {
        await lot.save();
      }
    }

    const reqLike = {
      body: {
        area,
        floor: requestDoc.floor,
        parkingLotName: lotName,
        vehicleType: requestDoc.vehicleType,
        pricePerHour: requestDoc.pricePerHour,
        tags: requestDoc.tags,
        numberOfSpots: requestDoc.numberOfSpots,
      },
      user: req.user,
    };

    const { res: resLike, result } = createResCollector();
    await createParkingSpot(reqLike, resLike);

    if (result.statusCode >= 400) {
      return res.status(result.statusCode).json({
        message: result.payload?.message || 'Failed to create spots from approved request',
        details: result.payload,
      });
    }

    requestDoc.status = 'approved';
    requestDoc.adminNote = toTrimmedString(req.body.adminNote || 'Approved by admin');
    requestDoc.reviewedBy = req.user._id;
    requestDoc.reviewedAt = new Date();
    requestDoc.approvedResult = {
      createdLot,
      createdSpotsCount: Number(result.payload?.count || 0),
    };
    await requestDoc.save();

    return res.json({
      message: 'Spot request approved and parking resources created successfully',
      request: requestDoc,
      lotCreated: createdLot,
      spotCreationResult: result.payload,
    });
  } catch (error) {
    console.error('approveSpotRequest error:', error);
    return res.status(500).json({ message: 'Server error while approving spot request' });
  }
};

export const rejectSpotRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const requestDoc = await ParkingSpotRequest.findById(id);
    if (!requestDoc) {
      return res.status(404).json({ message: 'Spot request not found' });
    }

    if (requestDoc.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${requestDoc.status}` });
    }

    requestDoc.status = 'rejected';
    requestDoc.adminNote = toTrimmedString(req.body.adminNote || 'Rejected by admin');
    requestDoc.reviewedBy = req.user._id;
    requestDoc.reviewedAt = new Date();
    await requestDoc.save();

    return res.json({ message: 'Spot request rejected successfully', request: requestDoc });
  } catch (error) {
    console.error('rejectSpotRequest error:', error);
    return res.status(500).json({ message: 'Server error while rejecting spot request' });
  }
};

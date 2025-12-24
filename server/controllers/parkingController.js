import ParkingSpot from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';

export const getAvailableSpots = async (req, res) => {
  try {
    const {
      parkingLotName: camelParkingLotName,
      parkinglotName,
      location,
      vehicleType,
      startTime,
      endTime,
      minPrice,
      maxPrice,
    } = req.query;

    const normalizedParkingLotName = camelParkingLotName || parkinglotName;

    const spotQuery = {};

    if (normalizedParkingLotName) {
      const lotRegex = { $regex: normalizedParkingLotName, $options: 'i' };
      spotQuery.$or = [
        { parkingLotName: lotRegex },
        { parkinglotName: lotRegex },
      ];
    }

    if (location) {
      spotQuery.location = { $regex: location, $options: 'i' };
    }

    if (vehicleType && vehicleType !== 'All') {
      spotQuery.vehicleType = vehicleType;
    }

    if (minPrice || maxPrice) {
      spotQuery.pricePerHour = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
      };
    }

    const allSpots = await ParkingSpot.find(spotQuery);

    if (!startTime || !endTime) {
      return res.json({ spots: allSpots, count: allSpots.length });
    }

    const bookedSpotIds = await Booking.find({
      parkingSpot: { $in: allSpots.map((s) => s._id) },
      status: 'booked',
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
    }).distinct('parkingSpot');

    const availableSpots = allSpots.filter((spot) => !bookedSpotIds.includes(spot._id.toString()));

    res.json({ availableSpots, count: availableSpots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const createParkingSpot = async (req, res) => {
  try {
    const {
      spotNum,
      parkingLotName: camelParkingLotName,
      parkinglotName,
      floor,
      location,
      area,
      vehicleType,
      pricePerHour,
      tags,
    } = req.body;

    const normalizedParkingLotName = (camelParkingLotName || parkinglotName || '').trim();
    const trimmedLocation = (location || area || '').trim();
    const normalizedSpotNum = (spotNum || '').trim();

    if (!normalizedSpotNum) {
      return res.status(400).json({ message: 'spotNum is required' });
    }

    if (!normalizedParkingLotName) {
      return res.status(400).json({ message: 'parkingLotName is required' });
    }

    if (trimmedLocation === '') {
      return res.status(400).json({ message: 'area is required' });
    }

    const payload = {
      spotNum: normalizedSpotNum,
      parkingLotName: normalizedParkingLotName,
      floor,
      location: trimmedLocation,
      ...(vehicleType && { vehicleType }),
      ...(pricePerHour !== undefined && { pricePerHour }),
      ...(Array.isArray(tags) && { tags }),
    };

    // Try to create the spot - MongoDB's unique index on { parkingLotName: 1, spotNum: 1 } will catch duplicates
    // This index ensures: same spot number can exist in different parking lots, but not in the same parking lot
    console.log('Creating spot:', { parkingLotName: normalizedParkingLotName, spotNum: normalizedSpotNum });
    const spot = await ParkingSpot.create(payload);
    console.log('✅ Spot created successfully:', spot._id);
    return res.status(201).json({ spot });
  } catch (err) {
    if (err && err.code === 11000) {
      // MongoDB unique index violation - duplicate spot detected
      // The unique index on { parkingLotName: 1, spotNum: 1 } ensures no duplicates within the same parking lot
      console.log('✅ Duplicate detected - Spot already exists in this parking lot:', {
        parkingLotName: normalizedParkingLotName,
        spotNum: normalizedSpotNum,
        keyPattern: err.keyPattern
      });
      
      // Return clear error message immediately (no slow lookup)
      return res.status(409).json({ 
        message: `Spot number "${normalizedSpotNum}" already exists in "${normalizedParkingLotName}". Each parking lot must have unique spot numbers. You can use spot number "${normalizedSpotNum}" in other parking lots, but not in "${normalizedParkingLotName}" again.` 
      });
    }
    console.error('Error creating parking spot:', err);
    return res.status(500).json({ 
      message: err.message || 'Server error while creating parking spot', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

export const getParkingLotSummary = async (req, res) => {
  try {
    const lots = await ParkingSpot.aggregate([
      {
        $addFields: {
          normalizedParkingLotName: {
            $trim: {
              input: {
                $ifNull: ['$parkingLotName', '$parkinglotName'],
              },
            },
          },
          normalizedLocation: {
            $trim: {
              input: {
                $ifNull: ['$location', ''],
              },
            },
          },
        },
      },
      {
        $match: {
          normalizedParkingLotName: { $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: {
            parkingLotName: '$normalizedParkingLotName',
            location: '$normalizedLocation',
          },
          totalSpots: { $sum: 1 },
          vehicleTypes: { $addToSet: '$vehicleType' },
        },
      },
      {
        $project: {
          _id: 0,
          parkingLotName: '$_id.parkingLotName',
          location: { $ifNull: ['$_id.location', ''] },
          totalSpots: 1,
          vehicleTypes: {
            $filter: {
              input: '$vehicleTypes',
              as: 'type',
              cond: { $and: [{ $ne: ['$$type', null] }, { $ne: ['$$type', ''] }] },
            },
          },
        },
      },
      { $sort: { parkingLotName: 1, location: 1 } },
    ]);

    res.json({ lots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
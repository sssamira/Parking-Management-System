import ParkingSpot from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';

const getSurgeMultiplier = (startTime, endTime) => {
  const p = Number(process.env.SURGE_PERCENT || 20);
  const windows = (process.env.SURGE_HOURS || '08:00-10:00,17:00-19:00').split(',').map(w=>w.split('-'));
  const st = new Date(startTime);
  const en = new Date(endTime);
  if (isNaN(st) || isNaN(en) || en <= st) return 1;
  const hasOverlap = windows.some(([a,b])=>{
    const [ah,am] = a.split(':').map(Number);
    const [bh,bm] = b.split(':').map(Number);
    const s = new Date(st);
    const e = new Date(st);
    s.setHours(ah,am||0,0,0);
    e.setHours(bh,bm||0,0,0);
    return st < e && en > s;
  });
  return hasOverlap ? 1 + p/100 : 1;
};

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

    const mult = getSurgeMultiplier(startTime, endTime);
    const percent = Math.round((mult - 1) * 100);
    const availableSpotsWithPrice = availableSpots.map((s) => ({
      ...s.toObject(),
      computedPricePerHour: Number(((s.pricePerHour || 0) * mult).toFixed(2)),
      surgeApplied: mult > 1,
      surgePercent: mult > 1 ? percent : 0,
    }));

    res.json({ availableSpots: availableSpotsWithPrice, count: availableSpotsWithPrice.length });
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

    const spot = await ParkingSpot.create(payload);
    return res.status(201).json({ spot });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Spot number already exists in this parking lot' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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

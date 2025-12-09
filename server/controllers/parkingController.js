import ParkingSpot from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';

export const getAvailableSpots = async (req, res) => {
  try {
    const { parkinglotName, location, vehicleType, startTime, endTime, minPrice, maxPrice } = req.query;

   
    const spotQuery = {
      ...(parkinglotName && { parkinglotName }),
      ...(location && { location }),
      ...(vehicleType && { vehicleType }),
    };

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
      parkingSpot: { $in: allSpots.map(s => s._id) },
      status: 'booked',
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) }
    }).distinct('parkingSpot');

    const availableSpots = allSpots.filter(spot => !bookedSpotIds.includes(spot._id.toString()));

    res.json({ availableSpots, count: availableSpots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const createParkingSpot = async (req, res) => {
  try {
    const { spotNum, parkinglotName, floor, location, vehicleType, pricePerHour, tags } = req.body;

    const payload = {
      spotNum,
      parkinglotName,
      floor,
      location,
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
import ParkingSpot from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';

const normalizeLotName = (name = '') => name.trim().toLowerCase();

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

    const referenceDate = (() => {
      if (startTime) {
        const parsed = new Date(startTime);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date();
    })();

    const offerMap = new Map();
    const lotKeys = Array.from(new Set(
      allSpots
        .map((spot) => normalizeLotName(spot.parkingLotName || spot.parkinglotName || ''))
        .filter(Boolean)
    ));

    if (lotKeys.length > 0) {
      const activeOffers = await Offer.find({
        normalizedParkingLotName: { $in: lotKeys },
        startDate: { $lte: referenceDate },
        endDate: { $gte: referenceDate },
        isActive: true,
      }).lean();

      activeOffers.forEach((offer) => {
        offerMap.set(offer.normalizedParkingLotName, offer);
      });
    }

    const buildOfferPayload = (offer) => {
      if (!offer) {
        return null;
      }
      return {
        offerId: offer._id,
        parkingLotName: offer.parkingLotName,
        offerPercentage: offer.offerPercentage,
        priceAfterOffer: offer.priceAfterOffer,
        startDate: offer.startDate,
        endDate: offer.endDate,
      };
    };

    if (!startTime || !endTime) {
      const spotsWithOffers = allSpots.map((spot) => {
        const lotKey = normalizeLotName(spot.parkingLotName || spot.parkinglotName || '');
        const offer = lotKey ? offerMap.get(lotKey) : null;
        return {
          ...spot.toObject(),
          activeOffer: buildOfferPayload(offer),
        };
      });
      return res.json({ spots: spotsWithOffers, count: spotsWithOffers.length });
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
    const applyOfferPricing = (basePrice, offer) => {
      if (!offer) {
        return {
          price: basePrice,
          offerApplied: false,
          offerPricePerHour: null,
        };
      }

      let adjusted = basePrice;
      if (typeof offer.offerPercentage === 'number' && offer.offerPercentage > 0) {
        adjusted = Number((adjusted * (1 - offer.offerPercentage / 100)).toFixed(2));
      }
      if (typeof offer.priceAfterOffer === 'number') {
        adjusted = Number(offer.priceAfterOffer);
      }
      if (!Number.isFinite(adjusted) || adjusted < 0) {
        adjusted = 0;
      }

      return {
        price: adjusted,
        offerApplied: adjusted !== basePrice,
        offerPricePerHour: adjusted,
      };
    };

    const availableSpotsWithPrice = availableSpots.map((s) => {
      const spotObj = s.toObject();
      const lotKey = normalizeLotName(spotObj.parkingLotName || spotObj.parkinglotName || '');
      const offer = lotKey ? offerMap.get(lotKey) : null;
      const basePrice = Number(((spotObj.pricePerHour || 0) * mult).toFixed(2));
      const { price, offerApplied, offerPricePerHour } = applyOfferPricing(basePrice, offer);

      return {
        ...spotObj,
        computedPricePerHour: price,
        surgeApplied: mult > 1,
        surgePercent: mult > 1 ? percent : 0,
        offerApplied,
        offerPercentage: offer?.offerPercentage || 0,
        offerPricePerHour,
        activeOffer: buildOfferPayload(offer),
      };
    });

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
          avgPricePerHour: { $avg: '$pricePerHour' },
        },
      },
      {
        $project: {
          _id: 0,
          parkingLotName: '$_id.parkingLotName',
          location: { $ifNull: ['$_id.location', ''] },
          totalSpots: 1,
          avgPricePerHour: 1,
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

    const formattedLots = lots.map((lot) => ({
      ...lot,
      avgPricePerHour: typeof lot.avgPricePerHour === 'number'
        ? Number(lot.avgPricePerHour.toFixed(2))
        : null,
    }));

    res.json({ lots: formattedLots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

import Offer from '../models/Offer.js';
import ParkingSpot from '../models/ParkingSpots.js';

const normalizeLotName = (name) => (name || '').trim().toLowerCase();

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfDay = (date) => {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
};

const endOfDay = (date) => {
  const cloned = new Date(date);
  cloned.setHours(23, 59, 59, 999);
  return cloned;
};

const getTodayStart = () => startOfDay(new Date());

const getAveragePriceForLot = async (parkingLotName) => {
  const trimmed = (parkingLotName || '').trim();
  if (!trimmed) {
    return null;
  }

  const lotRegex = new RegExp(`^${escapeRegex(trimmed)}$`, 'i');

  const result = await ParkingSpot.aggregate([
    {
      $match: {
        pricePerHour: { $ne: null },
        $or: [
          { parkingLotName: lotRegex },
          { parkinglotName: lotRegex },
        ],
      },
    },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: '$pricePerHour' },
      },
    },
  ]);

  const avg = result[0]?.avgPrice;
  if (!Number.isFinite(avg)) {
    return null;
  }

  return Number(avg.toFixed(2));
};

const parseDate = (value, fallback = new Date()) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

export const getActiveOffers = async (req, res) => {
  try {
    const referenceDate = parseDate(req.query.date, new Date());
    const filter = {
      isActive: true,
      startDate: { $lte: referenceDate },
      endDate: { $gte: referenceDate },
    };

    if (req.query.parkingLotName) {
      filter.normalizedParkingLotName = normalizeLotName(req.query.parkingLotName);
    }

    const offers = await Offer.find(filter).sort({ startDate: 1 });
    res.json({ offers });
  } catch (error) {
    console.error('getActiveOffers error:', error);
    res.status(500).json({ message: 'Failed to fetch active offers', error: error.message });
  }
};

export const getOffers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.parkingLotName) {
      filter.normalizedParkingLotName = normalizeLotName(req.query.parkingLotName);
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const offers = await Offer.find(filter).sort({ createdAt: -1 }).lean();

    const now = new Date();
    const offersWithStatus = offers.map((offer) => {
      const start = new Date(offer.startDate);
      const end = new Date(offer.endDate);

      let computedStatus = 'active';
      if (!offer.isActive) {
        computedStatus = 'inactive';
      } else if (!Number.isNaN(start.getTime()) && now < start) {
        computedStatus = 'upcoming';
      } else if (!Number.isNaN(end.getTime()) && now > end) {
        computedStatus = 'expired';
      }

      return {
        ...offer,
        computedStatus,
      };
    });

    res.json({ offers: offersWithStatus });
  } catch (error) {
    console.error('getOffers error:', error);
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const {
      parkingLotName,
      startDate,
      endDate,
      offerPercentage,
      isActive = true,
      notes,
    } = req.body;

    if (!parkingLotName || !startDate || !endDate) {
      return res.status(400).json({ message: 'parkingLotName, startDate, and endDate are required' });
    }

    const trimmedLotName = parkingLotName.trim();
    if (!trimmedLotName) {
      return res.status(400).json({ message: 'parkingLotName is required' });
    }

    if (offerPercentage === undefined || offerPercentage === null) {
      return res.status(400).json({ message: 'offerPercentage is required' });
    }

    const numericPercentage = Number(offerPercentage);

    if (!Number.isFinite(numericPercentage) || numericPercentage < 0 || numericPercentage > 100) {
      return res.status(400).json({ message: 'offerPercentage must be a number between 0 and 100' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'startDate and endDate must be valid dates' });
    }

    const normalizedStart = startOfDay(start);
    const normalizedEnd = endOfDay(end);

    const todayStart = getTodayStart();

    if (normalizedStart < todayStart) {
      return res.status(400).json({ message: 'startDate cannot be in the past' });
    }

    if (normalizedStart > normalizedEnd) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const averagePrice = await getAveragePriceForLot(trimmedLotName);

    if (averagePrice === null) {
      return res.status(400).json({ message: `No pricing data found for parking lot "${trimmedLotName}"` });
    }

    const computedPriceAfterOffer = Number(
      (averagePrice * (1 - numericPercentage / 100)).toFixed(2)
    );

    const offer = await Offer.create({
      parkingLotName: trimmedLotName,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      offerPercentage: numericPercentage,
      priceAfterOffer: computedPriceAfterOffer,
      isActive,
      notes,
      normalizedParkingLotName: normalizeLotName(trimmedLotName),
    });

    res.status(201).json({ offer });
  } catch (error) {
    console.error('createOffer error:', error);
    res.status(500).json({ message: 'Failed to create offer', error: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const updates = { ...req.body };
    let lotChanged = false;
    let percentageChanged = false;

    const todayStart = getTodayStart();

    if (updates.startDate) {
      const parsed = new Date(updates.startDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'startDate must be a valid date' });
      }
      const normalized = startOfDay(parsed);
      if (normalized < todayStart) {
        return res.status(400).json({ message: 'startDate cannot be in the past' });
      }
      offer.startDate = normalized;
    }

    if (updates.endDate) {
      const parsed = new Date(updates.endDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'endDate must be a valid date' });
      }
      const normalized = endOfDay(parsed);
      if (normalized < todayStart) {
        return res.status(400).json({ message: 'endDate cannot be in the past' });
      }
      offer.endDate = normalized;
    }

    if (offer.startDate && offer.endDate && offer.startDate > offer.endDate) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    if (updates.parkingLotName) {
      const trimmed = updates.parkingLotName.trim();
      if (!trimmed) {
        return res.status(400).json({ message: 'parkingLotName cannot be empty' });
      }
      offer.parkingLotName = trimmed;
      offer.normalizedParkingLotName = normalizeLotName(trimmed);
      lotChanged = true;
    }

    if (updates.isActive !== undefined) {
      offer.isActive = Boolean(updates.isActive);
    }

    if (updates.notes !== undefined) {
      offer.notes = updates.notes;
    }

    if (updates.offerPercentage !== undefined) {
      const numeric = Number(updates.offerPercentage);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
        return res.status(400).json({ message: 'offerPercentage must be a number between 0 and 100' });
      }
      offer.offerPercentage = numeric;
      percentageChanged = true;
    }

    if (lotChanged || percentageChanged) {
      const lotNameForCalculation = offer.parkingLotName;
      const avgPrice = await getAveragePriceForLot(lotNameForCalculation);
      if (avgPrice === null) {
        return res.status(400).json({ message: `No pricing data found for parking lot "${lotNameForCalculation}"` });
      }
      const pct = Number(offer.offerPercentage) || 0;
      offer.priceAfterOffer = Number((avgPrice * (1 - pct / 100)).toFixed(2));
    }

    await offer.save();

    res.json({ offer });
  } catch (error) {
    console.error('updateOffer error:', error);
    res.status(500).json({ message: 'Failed to update offer', error: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted', offerId: id });
  } catch (error) {
    console.error('deleteOffer error:', error);
    res.status(500).json({ message: 'Failed to delete offer', error: error.message });
  }
};

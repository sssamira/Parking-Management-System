import ParkingSpot from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';
import ParkingLot from '../models/ParkingLot.js';

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

// Helper function to find available spot numbers for a parking lot
// IMPORTANT: Each parking lot has its own independent spot numbering starting from 1
// For example: "Aarong" can have spots 1-10, "Bashundhara City" can also have spots 1-10
// The unique constraint is on (parkingLotName + spotNum), not just spotNum
// This function will fill gaps first, then continue from the highest number
const findNextSpotNumbers = async (parkingLotName, count, location = null) => {
  // Find all existing spots that could conflict
  // The database has a unique index on (parkingLotName + spotNum), so we need to check by parkingLotName
  // We need to find all spots with the SAME parkingLotName to check which spot numbers are already taken
  
  // Normalize parking lot name to ensure consistent matching
  const normalizedParkingLotName = (parkingLotName || '').trim();
  
  if (!normalizedParkingLotName) {
    throw new Error('parkingLotName is required to find available spot numbers');
  }
  
  // Build query to find spots with the same parkingLotName (case-insensitive for safety)
  // The unique index is on parkingLotName + spotNum, so we need to check all spots for this parking lot
  // CRITICAL: Also check for spots with null parkingLotName that might conflict
  const conflictQuery = {
    $or: [
      { parkingLotName: normalizedParkingLotName },
      { parkinglotName: normalizedParkingLotName }, // Also check lowercase variant for compatibility
      { parkingLotName: null }, // Check for null values that might conflict
      { parkinglotName: null }  // Check for null values in lowercase field
    ]
  };
  
  // Find all existing spots for this parking lot to check which spot numbers are taken
  // Also find spots with null parkingLotName that could cause conflicts
  const existingSpots = await ParkingSpot.find(conflictQuery).select('spotNum parkingLotName parkinglotName').lean();
  
  // Also check for spots with null parkingLotName that might have the spot numbers we want
  const nullSpots = await ParkingSpot.find({
    $or: [
      { parkingLotName: null },
      { parkinglotName: null },
      { parkingLotName: { $exists: false } },
      { parkinglotName: { $exists: false } }
    ]
  }).select('spotNum parkingLotName parkinglotName').lean();
  
  console.log(`🔍 Found ${existingSpots.length} existing spots for parking lot "${normalizedParkingLotName}"`);
  console.log(`🔍 Found ${nullSpots.length} spots with null parkingLotName that might conflict`);
  
  // Combine both sets to check for conflicts
  const allConflictingSpots = [...existingSpots, ...nullSpots];

  // Create a set of existing spot numbers (as strings) for exact matching
  // Also extract numeric values for gap filling
  const existingSpotNums = new Set();
  const existingNumbers = new Set();
  
  allConflictingSpots.forEach(spot => {
    const spotNum = (spot.spotNum || '').trim();
    if (spotNum) {
      // Store exact spot number for duplicate checking
      existingSpotNums.add(spotNum);
      
      // Extract numeric value for gap filling
      const match = spotNum.match(/(\d+)$/);
      if (match) {
        existingNumbers.add(parseInt(match[1]));
      }
    }
  });
  
  console.log(`🔍 Existing spot numbers for "${normalizedParkingLotName}": ${Array.from(existingNumbers).sort((a, b) => a - b).join(', ') || 'none'}`);

  // Always start from 1 for this parking lot (independent of other parking lots)
  // Find exactly 'count' available spot numbers, starting from 1 and continuing until we have enough
  const spotNums = [];
  let currentNumber = 1;
  let found = 0;

  // Keep searching until we find exactly the requested number of available spots
  // Start from 1 and continue sequentially, skipping any that already exist
  while (found < count && currentNumber <= 10000) { // Increased limit to ensure we can always find enough
    const spotNumStr = currentNumber.toString();
    // Check both: numeric value not in set AND exact string not in set
    if (!existingNumbers.has(currentNumber) && !existingSpotNums.has(spotNumStr)) {
      spotNums.push(spotNumStr);
      found++;
    }
    currentNumber++;
    
    // If we've checked a lot of numbers and still haven't found enough, 
    // there might be an issue, but continue searching
    if (currentNumber > 10000) {
      console.warn(`⚠️  Searched up to ${currentNumber} but only found ${found} available spots out of ${count} requested`);
      break;
    }
  }
  
  // If we still haven't found enough, something is wrong
  if (found < count) {
    console.error(`❌ Error: Only found ${found} available spot numbers out of ${count} requested for "${parkingLotName}"`);
    throw new Error(`Could not find enough available spot numbers. Found ${found} out of ${count} requested.`);
  }

  console.log(`✅ Generated spot numbers for "${parkingLotName}": ${spotNums.join(', ')} (independent of other parking lots)`);
  return spotNums;
};

export const createParkingSpot = async (req, res) => {
  try {
    const {
      parkingLotName: camelParkingLotName,
      parkinglotName,
      floor,
      location,
      area,
      vehicleType,
      pricePerHour,
      tags,
      numberOfSpots = 1,
    } = req.body;

    const normalizedParkingLotName = (camelParkingLotName || parkinglotName || '').trim();
    const trimmedLocation = (location || area || '').trim();
    const numSpots = parseInt(numberOfSpots) || 1;

    if (!normalizedParkingLotName) {
      return res.status(400).json({ message: 'parkingLotName is required' });
    }

    if (trimmedLocation === '') {
      return res.status(400).json({ message: 'area is required' });
    }

    if (numSpots < 1 || numSpots > 100) {
      return res.status(400).json({ message: 'numberOfSpots must be between 1 and 100' });
    }

    // Automatically generate exactly 'numSpots' available spot numbers
    // This function will continue searching until it finds the exact count requested
    // Pass location to ensure we check for duplicates correctly (there might be an index on area + spotNum)
    const spotNumbers = await findNextSpotNumbers(normalizedParkingLotName, numSpots, trimmedLocation);
    console.log(`🔢 Generated ${spotNumbers.length} spot numbers for ${normalizedParkingLotName}: ${spotNumbers.join(', ')}`);

    // Verify we have exactly the requested number
    if (spotNumbers.length !== numSpots) {
      return res.status(500).json({ 
        message: `Could not generate enough spot numbers. Generated ${spotNumbers.length} out of ${numSpots} requested.` 
      });
    }

    // Prepare all spots for creation (they should all be available since findNextSpotNumbers verified them)
    // Set both 'location' and 'area' to ensure compatibility (some indexes might use 'area')
    // IMPORTANT: Never set area to null - use a default value if location is empty
    // Ensure area is always a non-empty string to avoid conflicts with null area spots
    let areaValue = trimmedLocation && trimmedLocation.trim();
    if (!areaValue || areaValue === '') {
      areaValue = normalizedParkingLotName || 'default';
    }
    let locationValue = trimmedLocation && trimmedLocation.trim();
    if (!locationValue || locationValue === '') {
      locationValue = normalizedParkingLotName || 'default';
    }
    
    console.log(`📝 Using area="${areaValue}" and location="${locationValue}" for spot creation`);
    
    const spotsToCreate = spotNumbers.map(spotNum => {
      const spot = {
        parkingLotName: normalizedParkingLotName.trim(), // Ensure it's trimmed and never null
        floor,
        location: locationValue,
        area: areaValue, // Also set 'area' field to match any existing indexes - never null
        spotNum: spotNum,
        ...(vehicleType && { vehicleType }),
        ...(pricePerHour !== undefined && { pricePerHour }),
        ...(Array.isArray(tags) && { tags }),
      };
      // Double-check: ensure parkingLotName is never null/undefined/empty
      if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
        console.error(`❌ Error: Spot ${spotNum} has invalid parkingLotName`);
        spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
      }
      // Double-check: ensure area is never null/undefined/empty
      if (!spot.area || spot.area === '') {
        spot.area = normalizedParkingLotName || 'default';
      }
      return spot;
    });
    
    // Final validation: ensure all spots have non-null parkingLotName and area
    spotsToCreate.forEach((spot, idx) => {
      // CRITICAL: Ensure parkingLotName is never null/undefined/empty
      if (!spot.parkingLotName || spot.parkingLotName === '' || spot.parkingLotName === null || spot.parkingLotName === undefined) {
        console.error(`❌ CRITICAL ERROR: Spot ${idx} (spotNum=${spot.spotNum}) has invalid parkingLotName! Setting to: ${normalizedParkingLotName}`);
        spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
      } else {
        spot.parkingLotName = String(spot.parkingLotName).trim();
      }
      
      if (!spot.area || spot.area === '' || spot.area === null || spot.area === undefined) {
        console.warn(`⚠️  Spot ${idx} (spotNum=${spot.spotNum}) has invalid area, fixing...`);
        spot.area = areaValue || normalizedParkingLotName || 'default';
      }
      
      // Final double-check
      if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
        console.error(`❌ CRITICAL: Spot ${idx} still has invalid parkingLotName after fix!`);
        spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
      }
    });
    
    // Final validation pass - log first spot to verify data
    if (spotsToCreate.length > 0) {
      const firstSpot = spotsToCreate[0];
      console.log(`📝 Creating ${spotsToCreate.length} spots for "${normalizedParkingLotName}"`);
      console.log(`📝 Sample spot: spotNum="${firstSpot.spotNum}", parkingLotName="${firstSpot.parkingLotName}", area="${firstSpot.area}", floor=${firstSpot.floor}`);
      
      // Verify all spots have valid parkingLotName before insertion
      const invalidSpots = spotsToCreate.filter(spot => !spot.parkingLotName || spot.parkingLotName.trim() === '');
      if (invalidSpots.length > 0) {
        console.error(`❌ CRITICAL: Found ${invalidSpots.length} spots with invalid parkingLotName! Fixing...`);
        invalidSpots.forEach((spot, idx) => {
          spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
          console.error(`❌ Fixed spot ${idx}: parkingLotName="${spot.parkingLotName}"`);
        });
      }
    }

    const createdSpots = [];
    const errors = [];

    // Try to create all spots
    try {
      // CRITICAL: Ensure all spots are plain objects with correct field structure
      const spotsAsDocs = spotsToCreate.map(spotData => {
        const doc = {
          parkingLotName: String(spotData.parkingLotName || normalizedParkingLotName.trim() || 'default').trim(),
          spotNum: String(spotData.spotNum || '').trim(),
          floor: spotData.floor,
          location: String(spotData.location || '').trim(),
          area: String(spotData.area || '').trim(),
          vehicleType: spotData.vehicleType || 'All',
          pricePerHour: spotData.pricePerHour !== undefined ? spotData.pricePerHour : 50,
          ...(Array.isArray(spotData.tags) && { tags: spotData.tags })
        };
        
        // Final validation
        if (!doc.parkingLotName || doc.parkingLotName === '') {
          doc.parkingLotName = normalizedParkingLotName.trim() || 'default';
        }
        
        return doc;
      });
      
      const results = await ParkingSpot.insertMany(spotsAsDocs, { ordered: false });
      createdSpots.push(...results);
      console.log(`✅ Successfully created ${results.length} spot(s) for ${normalizedParkingLotName}`);
    } catch (insertErr) {
      // Handle partial success (some spots created, some failed)
      if (insertErr.writeErrors) {
        // Some spots were created successfully
        if (insertErr.insertedIds && Object.keys(insertErr.insertedIds).length > 0) {
          const insertedIds = Object.values(insertErr.insertedIds);
          const successfulSpots = await ParkingSpot.find({ _id: { $in: insertedIds } });
          createdSpots.push(...successfulSpots);
        }

        // If some failed, we need to find replacement spot numbers and create them
        const failedCount = insertErr.writeErrors.length;
        if (failedCount > 0 && createdSpots.length < numSpots) {
          console.log(`⚠️  ${failedCount} spot(s) failed to create. Finding replacement spot numbers...`);
          
          // Find replacement spot numbers for the ones that failed
          const remainingCount = numSpots - createdSpots.length;
          
          // Ensure parking lot name is still valid (should never be null/empty at this point)
          if (!normalizedParkingLotName || normalizedParkingLotName.trim() === '') {
            console.error('❌ Error: normalizedParkingLotName is empty when creating replacement spots');
            errors.push('Parking lot name is required but was missing');
          } else {
            const replacementNumbers = await findNextSpotNumbers(normalizedParkingLotName, remainingCount, trimmedLocation);
            
            // Create replacement spots
            // Use the same area/location values as initial spots to avoid conflicts
            let areaValue = trimmedLocation && trimmedLocation.trim();
            if (!areaValue || areaValue === '') {
              areaValue = normalizedParkingLotName || 'default';
            }
            let locationValue = trimmedLocation && trimmedLocation.trim();
            if (!locationValue || locationValue === '') {
              locationValue = normalizedParkingLotName || 'default';
            }
            
            const replacementSpots = replacementNumbers.map(spotNum => {
              // CRITICAL: Ensure parkingLotName is always set and never null
              const parkingLotNameValue = normalizedParkingLotName.trim() || 'default';
              
              const spot = {
                parkingLotName: parkingLotNameValue, // Always set to a valid value
                floor,
                location: locationValue,
                area: areaValue, // Also set 'area' field to match any existing indexes - never null
                spotNum: spotNum,
                ...(vehicleType && { vehicleType }),
                ...(pricePerHour !== undefined && { pricePerHour }),
                ...(Array.isArray(tags) && { tags }),
              };
              
              // Final validation: ensure parkingLotName is never null/undefined/empty
              if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
                console.error(`❌ CRITICAL ERROR: Replacement spot ${spotNum} has invalid parkingLotName! Setting to: ${parkingLotNameValue}`);
                spot.parkingLotName = parkingLotNameValue;
              } else {
                spot.parkingLotName = String(spot.parkingLotName).trim();
              }
              
              // Double-check one more time
              if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
                spot.parkingLotName = parkingLotNameValue;
              }
              
              return spot;
            });
            
            // Final validation pass for all replacement spots
            replacementSpots.forEach((spot, idx) => {
              if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
                console.error(`❌ CRITICAL: Replacement spot ${idx} (spotNum=${spot.spotNum}) still has invalid parkingLotName after mapping!`);
                spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
              }
            });

            // CRITICAL: Log what we're about to insert to debug the null issue
            if (replacementSpots.length > 0) {
              const firstReplacement = replacementSpots[0];
              console.log(`🔍 DEBUG: About to insert replacement spots. First spot:`, {
                parkingLotName: firstReplacement.parkingLotName,
                spotNum: firstReplacement.spotNum,
                area: firstReplacement.area,
                location: firstReplacement.location,
                floor: firstReplacement.floor,
                hasParkingLotName: !!firstReplacement.parkingLotName,
                parkingLotNameType: typeof firstReplacement.parkingLotName,
                parkingLotNameValue: String(firstReplacement.parkingLotName)
              });
              
              // Final safety check - ensure ALL spots have valid parkingLotName
              replacementSpots.forEach((spot, idx) => {
                if (!spot.parkingLotName || spot.parkingLotName === null || spot.parkingLotName === undefined || String(spot.parkingLotName).trim() === '') {
                  console.error(`❌ CRITICAL: Replacement spot ${idx} (spotNum=${spot.spotNum}) has NULL/EMPTY parkingLotName before insert!`);
                  spot.parkingLotName = normalizedParkingLotName.trim() || 'default';
                  console.error(`❌ Fixed to: "${spot.parkingLotName}"`);
                }
              });
            }
            
            try {
              // CRITICAL: Ensure all spots are plain objects with correct field names
              // Mongoose will handle the schema validation, but we need to ensure parkingLotName is set
              const replacementDocs = replacementSpots.map(spotData => {
                // Create a clean object with all required fields
                const doc = {
                  parkingLotName: String(spotData.parkingLotName || normalizedParkingLotName.trim() || 'default').trim(),
                  spotNum: String(spotData.spotNum || '').trim(),
                  floor: spotData.floor,
                  location: String(spotData.location || '').trim(),
                  area: String(spotData.area || '').trim(),
                  vehicleType: spotData.vehicleType || 'All',
                  pricePerHour: spotData.pricePerHour !== undefined ? spotData.pricePerHour : 50,
                  ...(Array.isArray(spotData.tags) && { tags: spotData.tags })
                };
                
                // Final validation
                if (!doc.parkingLotName || doc.parkingLotName === '') {
                  doc.parkingLotName = normalizedParkingLotName.trim() || 'default';
                }
                
                return doc;
              });
              
              const replacementResults = await ParkingSpot.insertMany(replacementDocs, { ordered: false });
              createdSpots.push(...replacementResults);
              console.log(`✅ Created ${replacementResults.length} replacement spot(s)`);
            } catch (replacementErr) {
              // If replacements also fail, collect errors
              console.error('Replacement spot creation error:', replacementErr);
              
              if (replacementErr.writeErrors && Array.isArray(replacementErr.writeErrors)) {
                replacementErr.writeErrors.forEach((error) => {
                  if (error.code === 11000) {
                    const failedSpotNum = replacementSpots[error.index]?.spotNum || 'unknown';
                    errors.push(`Spot "${failedSpotNum}" already exists`);
                  } else {
                    // Try multiple ways to extract error message
                    const errorMsg = error.errmsg || 
                                   error.err?.errmsg || 
                                   error.err?.message || 
                                   error.message || 
                                   replacementErr.message ||
                                   String(error) ||
                                   'Duplicate key error or unknown error';
                    errors.push(`Failed to create replacement spot: ${errorMsg}`);
                  }
                });
              } else {
                // Handle non-writeErrors case - try to extract meaningful error
                const errorMsg = replacementErr.message || 
                               replacementErr.errmsg || 
                               (replacementErr.err && replacementErr.err.errmsg) ||
                               (replacementErr.err && replacementErr.err.message) ||
                               String(replacementErr) ||
                               'Unknown error';
                errors.push(`Failed to create replacement spots: ${errorMsg}`);
              }
            }
          }
        }

        // Collect errors for spots that failed
        if (insertErr.writeErrors && Array.isArray(insertErr.writeErrors)) {
          insertErr.writeErrors.forEach((error) => {
            if (error.code === 11000) {
              const failedSpotNum = spotsToCreate[error.index]?.spotNum || 'unknown';
              // Extract more details from duplicate key error
              const dupKeyInfo = error.errmsg || error.err?.errmsg || '';
              errors.push(`Spot "${failedSpotNum}" already exists in "${normalizedParkingLotName}"${dupKeyInfo ? `: ${dupKeyInfo}` : ''}`);
            } else {
              // Try multiple ways to extract error message
              const errorMsg = error.errmsg || 
                             error.err?.errmsg || 
                             error.err?.message || 
                             error.message || 
                             String(error) ||
                             'Unknown error';
              errors.push(`Failed to create spot: ${errorMsg}`);
            }
          });
        }
      } else {
        // All spots failed
        throw insertErr;
      }
    }
    
    // Final check: ensure we created the exact number requested
    if (createdSpots.length < numSpots) {
      const stillNeeded = numSpots - createdSpots.length;
      console.log(`⚠️  Still need ${stillNeeded} more spot(s). Attempting to create replacements...`);
      
      // Keep trying until we have the exact count (increase attempts to ensure we get all spots)
      let attempts = 0;
      const maxAttempts = 10; // Increased from 5 to ensure we can create all requested spots
      while (createdSpots.length < numSpots && attempts < maxAttempts) {
        attempts++;
        const needed = numSpots - createdSpots.length;
        const additionalNumbers = await findNextSpotNumbers(normalizedParkingLotName, needed, trimmedLocation);
        
        // Use the same area/location values as initial spots to avoid conflicts
        let areaValue = trimmedLocation && trimmedLocation.trim();
        if (!areaValue || areaValue === '') {
          areaValue = normalizedParkingLotName || 'default';
        }
        let locationValue = trimmedLocation && trimmedLocation.trim();
        if (!locationValue || locationValue === '') {
          locationValue = normalizedParkingLotName || 'default';
        }
        
        // CRITICAL: Ensure parkingLotName is always valid before creating spots
        const parkingLotNameValue = normalizedParkingLotName.trim() || 'default';
        
        const additionalSpots = additionalNumbers.map(spotNum => {
          const spot = {
            parkingLotName: parkingLotNameValue, // Always set to a valid value
            floor,
            location: locationValue,
            area: areaValue, // Also set 'area' field to match any existing indexes - never null
            spotNum: spotNum,
            ...(vehicleType && { vehicleType }),
            ...(pricePerHour !== undefined && { pricePerHour }),
            ...(Array.isArray(tags) && { tags }),
          };
          // Double-check: ensure parkingLotName is never null/undefined/empty
          if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
            console.error(`❌ CRITICAL ERROR: Additional spot ${spotNum} has invalid parkingLotName! Setting to: ${parkingLotNameValue}`);
            spot.parkingLotName = parkingLotNameValue;
          } else {
            spot.parkingLotName = String(spot.parkingLotName).trim();
          }
          // Double-check: ensure area is never null/undefined/empty
          if (!spot.area || spot.area === '') {
            spot.area = normalizedParkingLotName || 'default';
          }
          return spot;
        });
        
        // Final validation: ensure all additional spots have valid parkingLotName and area
        additionalSpots.forEach((spot, idx) => {
          if (!spot.parkingLotName || spot.parkingLotName.trim() === '' || spot.parkingLotName === null || spot.parkingLotName === undefined) {
            console.error(`❌ CRITICAL: Additional spot ${idx} (spotNum=${spot.spotNum}) has invalid parkingLotName!`);
            spot.parkingLotName = parkingLotNameValue;
          }
          if (!spot.area || spot.area === '' || spot.area === null || spot.area === undefined) {
            console.warn(`⚠️  Additional spot ${idx} (spotNum=${spot.spotNum}) has invalid area, fixing...`);
            spot.area = areaValue || normalizedParkingLotName || 'default';
          }
        });
        
        // CRITICAL: Log what we're about to insert
        if (additionalSpots.length > 0) {
          const firstAdditional = additionalSpots[0];
          console.log(`🔍 DEBUG: About to insert additional spots. First spot:`, {
            parkingLotName: firstAdditional.parkingLotName,
            spotNum: firstAdditional.spotNum,
            area: firstAdditional.area,
            hasParkingLotName: !!firstAdditional.parkingLotName,
            parkingLotNameType: typeof firstAdditional.parkingLotName
          });
          
          // Final safety check
          additionalSpots.forEach((spot, idx) => {
            if (!spot.parkingLotName || spot.parkingLotName === null || spot.parkingLotName === undefined || String(spot.parkingLotName).trim() === '') {
              console.error(`❌ CRITICAL: Additional spot ${idx} (spotNum=${spot.spotNum}) has NULL/EMPTY parkingLotName before insert!`);
              spot.parkingLotName = parkingLotNameValue;
              console.error(`❌ Fixed to: "${spot.parkingLotName}"`);
            }
          });
        }
        
        console.log(`📝 Creating ${additionalSpots.length} replacement spots with area="${areaValue}" (sample: spotNum=${additionalSpots[0]?.spotNum}, area=${additionalSpots[0]?.area})`);

        try {
          // CRITICAL: Ensure all spots are plain objects with correct field names
          const additionalDocs = additionalSpots.map(spotData => {
            const doc = {
              parkingLotName: String(spotData.parkingLotName || parkingLotNameValue).trim(),
              spotNum: String(spotData.spotNum || '').trim(),
              floor: spotData.floor,
              location: String(spotData.location || '').trim(),
              area: String(spotData.area || '').trim(),
              vehicleType: spotData.vehicleType || 'All',
              pricePerHour: spotData.pricePerHour !== undefined ? spotData.pricePerHour : 50,
              ...(Array.isArray(spotData.tags) && { tags: spotData.tags })
            };
            
            if (!doc.parkingLotName || doc.parkingLotName === '') {
              doc.parkingLotName = parkingLotNameValue;
            }
            
            return doc;
          });
          
          const additionalResults = await ParkingSpot.insertMany(additionalDocs, { ordered: false });
          createdSpots.push(...additionalResults);
          console.log(`✅ Created ${additionalResults.length} additional spot(s) (attempt ${attempts})`);
        } catch (additionalErr) {
          // Handle partial success - some spots may have been created
          if (additionalErr.insertedIds && Object.keys(additionalErr.insertedIds).length > 0) {
            const insertedIds = Object.values(additionalErr.insertedIds);
            const successfulSpots = await ParkingSpot.find({ _id: { $in: insertedIds } });
            createdSpots.push(...successfulSpots);
            console.log(`✅ Partial success: Created ${successfulSpots.length} spot(s) out of ${additionalSpots.length} attempted (attempt ${attempts})`);
          }
          
          // If we still need more spots, continue to next attempt
          if (createdSpots.length < numSpots) {
            console.warn(`⚠️  Attempt ${attempts} partially failed. Still need ${numSpots - createdSpots.length} more spot(s). Will try again...`);
          }
          
          // Extract error message for logging
          let errorMsg = 'Unknown error';
          if (additionalErr.writeErrors && Array.isArray(additionalErr.writeErrors)) {
            additionalErr.writeErrors.forEach((err) => {
              errorMsg = err.errmsg || err.err?.errmsg || err.err?.message || err.message || String(err) || 'Unknown error';
            });
          } else {
            errorMsg = additionalErr.message || 
                      additionalErr.errmsg || 
                      (additionalErr.err && additionalErr.err.errmsg) ||
                      (additionalErr.err && additionalErr.err.message) ||
                      String(additionalErr) ||
                      'Unknown error';
          }
          
          // Only add to errors if we're giving up (last attempt)
          if (attempts >= maxAttempts && createdSpots.length < numSpots) {
            errors.push(`Failed to create all additional spots after ${attempts} attempts: ${errorMsg}`);
          }
        }
      }
    }

    if (createdSpots.length === 0) {
      // No spots were created
      if (errors.length > 0) {
        return res.status(409).json({
          message: errors[0] || 'Failed to create parking spots',
          errors: errors
        });
      }
      return res.status(500).json({ message: 'Failed to create parking spots' });
    }

    // Ensure we created the exact number requested - keep retrying if needed
    if (createdSpots.length < numSpots) {
      const stillNeeded = numSpots - createdSpots.length;
      console.log(`⚠️  Still need ${stillNeeded} more spot(s). Making final attempt...`);
      
      // Get fresh spot numbers that definitely don't exist
      const finalNumbers = await findNextSpotNumbers(normalizedParkingLotName, stillNeeded, trimmedLocation);
      
      // Use the same area/location values as initial spots to avoid conflicts
      let areaValue = trimmedLocation && trimmedLocation.trim();
      if (!areaValue || areaValue === '') {
        areaValue = normalizedParkingLotName || 'default';
      }
      let locationValue = trimmedLocation && trimmedLocation.trim();
      if (!locationValue || locationValue === '') {
        locationValue = normalizedParkingLotName || 'default';
      }
      
      // CRITICAL: Ensure parkingLotName is always valid before creating final spots
      const finalParkingLotNameValue = normalizedParkingLotName.trim() || 'default';
      
      const finalSpots = finalNumbers.map(spotNum => {
        const spot = {
          parkingLotName: finalParkingLotNameValue, // Always set to a valid value
          floor,
          location: locationValue,
          area: areaValue, // Also set 'area' field to match any existing indexes - never null
          spotNum: spotNum,
          ...(vehicleType && { vehicleType }),
          ...(pricePerHour !== undefined && { pricePerHour }),
          ...(Array.isArray(tags) && { tags }),
        };
        // Final validation: ensure parkingLotName is never null/undefined/empty
        if (!spot.parkingLotName || spot.parkingLotName.trim() === '') {
          console.error(`❌ CRITICAL ERROR: Final spot ${spotNum} has invalid parkingLotName! Setting to: ${finalParkingLotNameValue}`);
          spot.parkingLotName = finalParkingLotNameValue;
        } else {
          spot.parkingLotName = String(spot.parkingLotName).trim();
        }
        return spot;
      });
      
      // Final validation pass for all final spots
      finalSpots.forEach((spot, idx) => {
        if (!spot.parkingLotName || spot.parkingLotName.trim() === '' || spot.parkingLotName === null || spot.parkingLotName === undefined) {
          console.error(`❌ CRITICAL: Final spot ${idx} (spotNum=${spot.spotNum}) has invalid parkingLotName!`);
          spot.parkingLotName = finalParkingLotNameValue;
        }
      });

      try {
        // CRITICAL: Ensure all spots are plain objects with correct field names
        const finalDocs = finalSpots.map(spotData => {
          const doc = {
            parkingLotName: String(spotData.parkingLotName || finalParkingLotNameValue).trim(),
            spotNum: String(spotData.spotNum || '').trim(),
            floor: spotData.floor,
            location: String(spotData.location || '').trim(),
            area: String(spotData.area || '').trim(),
            vehicleType: spotData.vehicleType || 'All',
            pricePerHour: spotData.pricePerHour !== undefined ? spotData.pricePerHour : 50,
            ...(Array.isArray(spotData.tags) && { tags: spotData.tags })
          };
          
          if (!doc.parkingLotName || doc.parkingLotName === '') {
            doc.parkingLotName = finalParkingLotNameValue;
          }
          
          return doc;
        });
        
        const finalResults = await ParkingSpot.insertMany(finalDocs, { ordered: false });
        createdSpots.push(...finalResults);
        console.log(`✅ Created ${finalResults.length} final spot(s)`);
      } catch (finalErr) {
        // Handle partial success - some spots may have been created
        if (finalErr.insertedIds && Object.keys(finalErr.insertedIds).length > 0) {
          const insertedIds = Object.values(finalErr.insertedIds);
          const successfulSpots = await ParkingSpot.find({ _id: { $in: insertedIds } });
          createdSpots.push(...successfulSpots);
          console.log(`✅ Final attempt partial success: Created ${successfulSpots.length} spot(s) out of ${finalSpots.length} attempted`);
        }
        
        // Log errors for spots that failed
        let errorMsg = 'Unknown error';
        if (finalErr.writeErrors && Array.isArray(finalErr.writeErrors)) {
          finalErr.writeErrors.forEach((error) => {
            errorMsg = error.errmsg || 
                      error.err?.errmsg || 
                      error.err?.message || 
                      error.message || 
                      String(error) ||
                      'Unknown error';
            errors.push(`Failed to create final spot: ${errorMsg}`);
          });
        } else {
          errorMsg = finalErr.message || 
                    finalErr.errmsg || 
                    (finalErr.err && finalErr.err.errmsg) ||
                    (finalErr.err && finalErr.err.message) ||
                    String(finalErr) ||
                    'Unknown error';
          errors.push(`Failed to create final spots: ${errorMsg}`);
        }
        console.error(`❌ Final attempt errors: ${errorMsg}`);
      }
    }

    // Return success with count
    if (createdSpots.length === numSpots) {
      // Perfect success - created exactly what was requested
      const response = {
        message: `Successfully created ${createdSpots.length} parking spot(s)`,
        count: createdSpots.length,
        spots: createdSpots,
      };
      return res.status(201).json(response);
    } else {
      // Partial success - created some but not all
      const response = {
        message: `Successfully created ${createdSpots.length} of ${numSpots} spot(s)`,
        count: createdSpots.length,
        spots: createdSpots,
        requested: numSpots,
      };
      
      if (errors.length > 0) {
        response.warnings = errors;
        response.partialSuccess = true;
      }
      
      return res.status(201).json(response);
    }
  } catch (err) {
    console.error('Error creating parking spot:', err);
    return res.status(500).json({ 
      message: err.message || 'Server error while creating parking spot', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

export const getParkingLotSummary = async (req, res) => {
  try {
    // Source of truth: ParkingLot collection (distinct names)
    // Enrich with derived spot metrics from ParkingSpot.
    const lots = await ParkingLot.aggregate([
      {
        $match: {
          name: { $nin: [null, ''] },
        },
      },
      {
        $lookup: {
          from: 'parkingspots',
          localField: 'name',
          foreignField: 'parkingLotName',
          as: 'spots',
        },
      },
      {
        $addFields: {
          totalSpots: { $size: '$spots' },
          avgPricePerHour: { $avg: '$spots.pricePerHour' },
          vehicleTypes: {
            $setUnion: [
              {
                $map: {
                  input: '$spots',
                  as: 'spot',
                  in: '$$spot.vehicleType',
                },
              },
              [],
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          parkingLotName: '$name',
          location: { $ifNull: ['$location', ''] },
          address: { $ifNull: ['$address', ''] },
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
      { $sort: { parkingLotName: 1 } },
    ]);

    const formattedLots = lots.map((lot) => ({
      ...lot,
      avgPricePerHour: typeof lot.avgPricePerHour === 'number' ? Number(lot.avgPricePerHour.toFixed(2)) : null,
    }));

    res.json({ lots: formattedLots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

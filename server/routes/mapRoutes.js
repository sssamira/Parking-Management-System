import express from 'express';
import ParkingLot from '../models/ParkingLot.js';
import ParkingSpots from '../models/ParkingSpots.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// @route   GET /api/map/parking-lots
// @desc    Get all parking lots with REAL availability
// @access  Public
router.get('/parking-lots', async (req, res) => {
  try {
    console.log("📡 API called: /api/map/parking-lots");
    
    // Get ALL parking lots
    const parkingLots = await ParkingLot.find({});
    console.log(`📊 Found ${parkingLots.length} parking lots in database`);
    
    const lotsWithAvailability = await Promise.all(
      parkingLots.map(async (lot) => {
        try {
          // 1. Get REAL spots for this lot
          const spots = await ParkingSpots.find({ parkingLotName: lot.name });
          const totalSpots = spots.length;
          
          // 2. Get REAL active bookings for this lot
          const now = new Date();
          const bookedSpots = await Booking.countDocuments({
            parkingLotName: lot.name,
            startTime: { $lte: now },
            endTime: { $gte: now },
            status: { $in: ['booked', 'active', 'approved'] }
          });
          
          const availableSpots = Math.max(0, totalSpots - bookedSpots);
          
          // 3. Calculate REAL average price
          let pricePerHour = lot.type === 'free' ? 0 : 50; // Default
          if (spots.length > 0) {
            const avgPrice = spots.reduce((sum, spot) => sum + spot.pricePerHour, 0) / spots.length;
            pricePerHour = Math.round(avgPrice);
          }
          
          // 4. Determine color based on REAL availability
          let color = 'red'; // default: not available
          
          if (availableSpots > 0) {
            if (lot.type === 'paid') {
              color = 'blue'; // paid parking available
            } else if (lot.type === 'free') {
              color = 'orange'; // free parking available
            } else {
              color = 'green'; // mixed or general available
            }
          }
          
          return {
            id: lot._id,
            name: lot.name,
            address: lot.address,
            location: lot.location,
            latitude: lot.latitude,
            longitude: lot.longitude,
            totalSpots: totalSpots,
            availableSpots: availableSpots,
            pricePerHour: pricePerHour,
            type: lot.type,
            color: color,
            isOpen: lot.isOpen,
            amenities: lot.amenities || [],
            openingHours: lot.openingHours || { open: '06:00', close: '22:00' },
            occupancyRate: totalSpots > 0 ? Math.round((availableSpots / totalSpots) * 100) : 0,
            // Add these for debugging
            _debug: {
              hasSpots: totalSpots > 0,
              bookedCount: bookedSpots,
              source: 'real-data'
            }
          };
        } catch (error) {
          console.error(`❌ Error processing lot ${lot.name}:`, error);
          // Return basic info if there's an error
          return {
            id: lot._id,
            name: lot.name,
            address: lot.address,
            location: lot.location,
            latitude: lot.latitude,
            longitude: lot.longitude,
            totalSpots: 0,
            availableSpots: 0,
            pricePerHour: lot.type === 'free' ? 0 : 50,
            type: lot.type,
            color: 'gray',
            isOpen: lot.isOpen,
            amenities: lot.amenities || [],
            openingHours: lot.openingHours || { open: '06:00', close: '22:00' },
            occupancyRate: 0,
            _debug: { error: error.message, source: 'fallback' }
          };
        }
      })
    );
    
    console.log(`🎨 Generated ${lotsWithAvailability.length} lots for API`);
    
    // Log summary
    const availableLots = lotsWithAvailability.filter(lot => lot.availableSpots > 0);
    console.log(`✅ ${availableLots.length} lots have available spots`);
    console.log(`🎨 Colors: ${[...new Set(lotsWithAvailability.map(l => l.color))].join(', ')}`);
    
    res.json({
      success: true,
      count: lotsWithAvailability.length,
      data: lotsWithAvailability
    });
  } catch (error) {
    console.error('❌ Map error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching parking lots',
      error: error.message
    });
  }
});

// @route   GET /api/map/nearby
// @desc    Get parking lots near user location
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius in kilometers
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    const parkingLots = await ParkingLot.find({});
    
    // Calculate distance for each lot
    const lotsWithDistance = parkingLots.map(lot => {
      const distance = calculateDistance(userLat, userLng, lot.latitude, lot.longitude);
      return { ...lot.toObject(), distance };
    });
    
    // Filter by radius and sort by distance
    const nearbyLots = lotsWithDistance
      .filter(lot => lot.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
    
    res.json({
      success: true,
      data: nearbyLots,
      userLocation: { lat: userLat, lng: userLng },
      radius: radiusKm
    });
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to calculate distance between coordinates (in kilometers)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;
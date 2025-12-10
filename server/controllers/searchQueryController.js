import Booking from '../models/Booking.js';

// @desc    Save search query details to bookings collection
// @route   POST /api/search-queries
// @access  Private
export const saveSearchQuery = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { location, vehicleType, date, startTime, endTime, carModel, driverName, licenseNumber } = req.body;

    // Create booking record with search query details
    const booking = await Booking.create({
      user: userId,
      location: location || '',
      vehicleType: vehicleType || '',
      date: date ? new Date(date) : null,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      carModel: carModel || '',
      driverName: driverName || '',
      licenseNumber: licenseNumber || '',
      vehicle: {
        licensePlate: licenseNumber || '',
        carType: vehicleType || ''
      },
      status: 'search_query',
      price: 0
    });

    return res.status(201).json({
      message: 'Search query saved successfully to bookings collection',
      booking,
    });
  } catch (err) {
    console.error('Save search query error:', err);
    return res.status(500).json({ message: 'Server error while saving search query', error: err.message });
  }
};

// @desc    Get user's search queries from bookings collection
// @route   GET /api/search-queries
// @access  Private
export const getUserSearchQueries = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all bookings with status 'search_query' for this user
    const searchQueries = await Booking.find({ 
      user: userId,
      status: 'search_query'
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      searchQueries,
      count: searchQueries.length,
    });
  } catch (err) {
    console.error('Get search queries error:', err);
    return res.status(500).json({ message: 'Server error while fetching search queries' });
  }
};

// @desc    Get all search queries (admin only)
// @route   GET /api/search-queries/admin/all
// @access  Private/Admin
export const getAllSearchQueries = async (req, res) => {
  try {
    // Get all bookings with status 'search_query'
    const searchQueries = await Booking.find({ 
      status: 'search_query'
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      searchQueries,
      count: searchQueries.length,
      message: 'All search queries retrieved successfully',
    });
  } catch (err) {
    console.error('Get all search queries error:', err);
    return res.status(500).json({ message: 'Server error while fetching all search queries' });
  }
};


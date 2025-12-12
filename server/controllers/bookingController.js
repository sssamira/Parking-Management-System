import Booking from '../models/Booking.js';
import ParkingSpot from '../models/ParkingSpots.js';
import nodemailer from 'nodemailer';

// Build a mail transporter if SMTP env vars are set
const transporter = (() => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    // Only log once on startup, not as a warning
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️  SMTP not configured. Booking confirmation emails will be skipped. To enable emails, configure SMTP settings in .env file.');
    }
    return null;
  }

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log('✅ SMTP configured successfully. Booking emails will be sent.');
    return transport;
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
    return null;
  }
})();

const sendBookingEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    // Log warning if SMTP not configured
    console.warn(`⚠️  SMTP not configured. Email not sent to: ${to}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `"Parking Management" <no-reply@parking.example>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`, info.messageId ? `(Message ID: ${info.messageId})` : '');
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    // Re-throw so caller can handle it
    throw err;
  }
};

// Helper: check overlap
const hasOverlap = async ({ spotId, startTime, endTime, excludeBookingId = null }) => {
  const query = {
    parkingSpot: spotId,
    status: { $in: ['booked', 'pending'] }, // Check both booked and pending bookings
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  
  // Exclude current booking if provided (for update operations)
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflict = await Booking.exists(query);
  return Boolean(conflict);
};

export const createBooking = async (req, res) => {
  try {
    console.log('📝 Creating booking request received');
    console.log('📝 Request body:', req.body);
    console.log('📝 User:', req.user?._id);
    
    const userId = req.user?._id;
    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { parkingSpotId, startTime, endTime, vehicle, priceOverride } = req.body;
    console.log('📝 Booking data:', { parkingSpotId, startTime, endTime, vehicle });
    if (!parkingSpotId) {
      return res.status(400).json({ message: 'parkingSpotId is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid startTime or endTime' });
    }
    if (start >= end) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    const spot = await ParkingSpot.findById(parkingSpotId);
    if (!spot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }

    const overlap = await hasOverlap({ spotId: spot._id, startTime: start, endTime: end });
    if (overlap) {
      return res.status(409).json({ message: 'This parking spot is already booked for the selected time window' });
    }

    const durationMs = end.getTime() - start.getTime();
    const durationHours = Math.max(durationMs / (1000 * 60 * 60), 0.5); // minimum 30 mins billed
    const price = priceOverride !== undefined
      ? Number(priceOverride)
      : Number((durationHours * spot.pricePerHour).toFixed(2));

    console.log('📝 Creating booking in database...');
    const booking = await Booking.create({
      parkingSpot: spot._id,
      user: userId,
      vehicle: {
        licensePlate: vehicle?.licensePlate,
        carType: vehicle?.carType,
      },
      startTime: start,
      endTime: end,
      status: 'pending', // Set status to 'pending' - needs admin approval
      price,
    });

    console.log('✅ Booking created successfully in database:', {
      bookingId: booking._id,
      spot: spot.parkingLotName || spot.parkinglotName,
      user: userId,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: booking.price
    });

    // Email will be sent after admin approval
    console.log('📧 Booking created with pending status. Email will be sent after admin approval.');

    return res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (err) {
    console.error('❌ Create booking error:', err);
    console.error('❌ Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    return res.status(500).json({ 
      message: 'Server error while creating booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const bookings = await Booking.find({ user: userId })
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      bookings,
      count: bookings.length,
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    return res.status(500).json({ 
      message: 'Server error while fetching bookings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get all pending bookings and search queries (admin only)
// @route   GET /api/bookings/admin/pending
// @access  Private/Admin
export const getPendingBookings = async (req, res) => {
  try {
    // Get both pending bookings and search queries
    const bookings = await Booking.find({ 
      status: { $in: ['pending', 'search_query'] } 
    })
      .populate({
        path: 'user',
        select: 'name email phone',
        model: 'User'
      })
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour vehicleType')
      .sort({ createdAt: -1 });

    console.log('📋 Admin fetching pending bookings:', {
      count: bookings.length,
      bookings: bookings.map(b => ({
        id: b._id,
        userId: b.user?._id || b.user,
        userName: b.user?.name,
        userEmail: b.user?.email,
        status: b.status
      }))
    });

    return res.status(200).json({
      bookings,
      count: bookings.length,
    });
  } catch (err) {
    console.error('Get pending bookings error:', err);
    return res.status(500).json({ 
      message: 'Server error while fetching pending bookings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Approve a booking (admin only)
// @route   PATCH /api/bookings/:id/approve
// @access  Private/Admin
export const approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending' && booking.status !== 'search_query') {
      return res.status(400).json({ 
        message: `Booking is already ${booking.status}. Only pending bookings and search queries can be approved.` 
      });
    }

    // Handle search queries differently from pending bookings
    if (booking.status === 'search_query') {
      // Check spot availability for the requested location
      const requestedLocation = booking.location?.trim();
      if (!requestedLocation) {
        return res.status(400).json({ 
          message: 'Cannot approve booking without a location specified' 
        });
      }

      // Count total spots at this location (case-insensitive)
      const totalSpots = await ParkingSpot.countDocuments({ 
        location: { $regex: new RegExp(`^${requestedLocation}$`, 'i') }
      });
      
      console.log('🔍 Checking spot availability:', {
        location: requestedLocation,
        totalSpots: totalSpots,
        bookingId: booking._id
      });
      
      if (totalSpots === 0) {
        return res.status(409).json({ 
          message: `No parking spots available at "${requestedLocation}". Do you want to add more spots?`,
          code: 'NO_SPOTS_AT_LOCATION',
          location: requestedLocation,
          suggestion: 'add_spots'
        });
      }

      // Count how many bookings are already approved/booked for this location
      // Use case-insensitive location matching
      const locationRegex = new RegExp(`^${requestedLocation}$`, 'i');
      let bookedCount = 0;
      
      if (booking.startTime && booking.endTime) {
        // Count bookings with overlapping time periods
        bookedCount = await Booking.countDocuments({
          $or: [
            { status: 'booked', location: locationRegex },
            { status: 'approved', location: locationRegex }
          ],
          startTime: { $lt: new Date(booking.endTime) },
          endTime: { $gt: new Date(booking.startTime) },
          _id: { $ne: booking._id } // Exclude current booking
        });
      } else {
        // If no time specified, count all approved/booked bookings for this location
        bookedCount = await Booking.countDocuments({
          $or: [
            { status: 'booked', location: locationRegex },
            { status: 'approved', location: locationRegex }
          ],
          _id: { $ne: booking._id }
        });
      }

      // Check if spots are available
      const availableSpots = totalSpots - bookedCount;
      
      console.log('📊 Spot availability check:', {
        location: requestedLocation,
        totalSpots: totalSpots,
        bookedCount: bookedCount,
        availableSpots: availableSpots,
        bookingId: booking._id
      });
      
      if (availableSpots <= 0) {
        return res.status(409).json({ 
          message: `All ${totalSpots} spot(s) at "${requestedLocation}" are already booked. Do you want to add more spots?`,
          code: 'NO_AVAILABLE_SPOTS',
          location: requestedLocation,
          totalSpots: totalSpots,
          bookedSpots: bookedCount,
          suggestion: 'add_spots'
        });
      }

      // For search queries, mark as approved (admin will assign spot later)
      booking.status = 'approved';
      await booking.save();

      console.log('✅ Search query approved:', {
        bookingId: booking._id,
        user: booking.user.email,
        location: booking.location,
        availableSpots: availableSpots,
        totalSpots: totalSpots
      });

      // Send approval email for search query
      try {
        await sendBookingEmail({
          to: booking.user.email,
          subject: 'Your parking spot request has been approved',
          html: `
            <h2>Request Approved</h2>
            <p>Hi ${booking.user.name || ''},</p>
            <p>Your parking spot request has been approved by the admin.</p>
            <ul>
              <li><strong>Location:</strong> ${booking.location || 'N/A'}</li>
              <li><strong>Vehicle Type:</strong> ${booking.vehicleType || 'N/A'}</li>
              ${booking.startTime ? `<li><strong>From:</strong> ${new Date(booking.startTime).toLocaleString()}</li>` : ''}
              ${booking.endTime ? `<li><strong>To:</strong> ${new Date(booking.endTime).toLocaleString()}</li>` : ''}
            </ul>
            <p>We will contact you shortly with spot assignment details.</p>
            <p>Thank you for choosing our service.</p>
          `,
        });
        console.log('📧 Approval email sent successfully to:', booking.user.email);
      } catch (emailError) {
        console.error('⚠️  Failed to send approval email, but booking was still approved:', emailError.message);
      }

      return res.status(200).json({
        message: 'Search query approved successfully',
        booking,
        availableSpots: availableSpots - 1, // Remaining after this approval
        totalSpots: totalSpots
      });
    }

    // For pending bookings, check for conflicts and assign spot
    if (!booking.parkingSpot) {
      return res.status(400).json({ 
        message: 'Cannot approve booking without a parking spot assigned' 
      });
    }

    // Check for conflicts with approved bookings (exclude current booking)
    const overlap = await hasOverlap({ 
      spotId: booking.parkingSpot._id, 
      startTime: booking.startTime, 
      endTime: booking.endTime,
      excludeBookingId: booking._id
    });
    
    if (overlap) {
      return res.status(409).json({ 
        message: 'This parking spot is already booked for the selected time window' 
      });
    }

    // Update status to 'booked' (approved)
    booking.status = 'booked';
    await booking.save();

    console.log('✅ Booking approved:', {
      bookingId: booking._id,
      user: booking.user.email,
      spot: booking.parkingSpot.parkingLotName || booking.parkingSpot.parkinglotName
    });

    // Send confirmation email to user
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    sendBookingEmail({
      to: booking.user.email,
      subject: 'Your parking spot booking is confirmed',
      html: `
        <h2>Booking Confirmed</h2>
        <p>Hi ${booking.user.name || ''},</p>
        <p>Your parking spot reservation has been approved and confirmed.</p>
        <ul>
          <li><strong>Spot:</strong> ${booking.parkingSpot.parkingLotName || booking.parkingSpot.parkinglotName || 'N/A'} - ${booking.parkingSpot.spotNum}</li>
          <li><strong>Location:</strong> ${booking.parkingSpot.location}</li>
          <li><strong>From:</strong> ${start.toLocaleString()}</li>
          <li><strong>To:</strong> ${end.toLocaleString()}</li>
          <li><strong>Price:</strong> ৳${booking.price}</li>
        </ul>
        <p>Thank you for choosing our service.</p>
      `,
    });

    return res.status(200).json({
      message: 'Booking approved successfully',
      booking,
    });
  } catch (err) {
    console.error('Approve booking error:', err);
    return res.status(500).json({ 
      message: 'Server error while approving booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Reject a booking (admin only)
// @route   PATCH /api/bookings/:id/reject
// @access  Private/Admin
export const rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending' && booking.status !== 'search_query') {
      return res.status(400).json({ 
        message: `Booking is already ${booking.status}. Only pending bookings and search queries can be rejected.` 
      });
    }

    // Check if it's a search query before changing status
    const isSearchQuery = booking.status === 'search_query' || !booking.parkingSpot;
    
    booking.status = 'rejected';
    await booking.save();

    console.log('❌ Booking rejected:', {
      bookingId: booking._id,
      user: booking.user.email,
      reason: reason || 'No reason provided',
      isSearchQuery: isSearchQuery
    });

    // Send rejection email to user immediately
    try {
      await sendBookingEmail({
        to: booking.user.email,
        subject: 'Your parking spot booking request has been rejected',
        html: `
          <h2>Booking Request Rejected</h2>
          <p>Hi ${booking.user.name || 'User'},</p>
          <p>We regret to inform you that your parking spot reservation request has been rejected by the administrator.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Request Details:</h3>
            <ul style="list-style: none; padding: 0;">
              ${isSearchQuery 
                ? `<li style="margin: 8px 0;"><strong>Location:</strong> ${booking.location || 'N/A'}</li>
                   <li style="margin: 8px 0;"><strong>Vehicle Type:</strong> ${booking.vehicleType || 'N/A'}</li>
                   ${booking.startTime ? `<li style="margin: 8px 0;"><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>` : ''}
                   ${booking.endTime ? `<li style="margin: 8px 0;"><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>` : ''}
                   ${booking.date ? `<li style="margin: 8px 0;"><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</li>` : ''}`
                 : `<li style="margin: 8px 0;"><strong>Spot:</strong> ${(booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || 'N/A')} - ${booking.parkingSpot?.spotNum || 'N/A'}</li>
                   <li style="margin: 8px 0;"><strong>Location:</strong> ${booking.parkingSpot?.location || 'N/A'}</li>
                   ${booking.startTime ? `<li style="margin: 8px 0;"><strong>From:</strong> ${new Date(booking.startTime).toLocaleString()}</li>` : ''}
                   ${booking.endTime ? `<li style="margin: 8px 0;"><strong>To:</strong> ${new Date(booking.endTime).toLocaleString()}</li>` : ''}`
              }
              ${reason ? `<li style="margin: 8px 0; color: #dc2626;"><strong>Rejection Reason:</strong> ${reason}</li>` : ''}
            </ul>
          </div>
          <p>You can submit a new booking request or contact our support team if you have any questions.</p>
          <p>Thank you for your understanding.</p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
        `,
      });
      console.log('📧 Rejection email sent successfully to:', booking.user.email);
    } catch (emailError) {
      // Log email error but don't fail the rejection
      console.error('⚠️  Failed to send rejection email, but booking was still rejected:', emailError.message);
    }

    return res.status(200).json({
      message: 'Booking rejected successfully',
      booking,
    });
  } catch (err) {
    console.error('Reject booking error:', err);
    return res.status(500).json({ 
      message: 'Server error while rejecting booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


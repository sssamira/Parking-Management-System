import Booking from '../models/Booking.js';
import ParkingSpot from '../models/ParkingSpots.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

// Build a mail transporter if SMTP env vars are set
const transporter = (() => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  
  // Check if all required variables are set
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️  SMTP not configured. Booking confirmation emails will be skipped.');
      console.log('   Missing:', {
        SMTP_HOST: !SMTP_HOST ? 'NOT SET' : 'SET',
        SMTP_PORT: !SMTP_PORT ? 'NOT SET' : 'SET',
        SMTP_USER: !SMTP_USER ? 'NOT SET' : 'SET',
        SMTP_PASS: !SMTP_PASS ? 'NOT SET' : 'SET',
      });
    }
    return null;
  }

  // Trim whitespace from credentials
  const cleanUser = SMTP_USER.trim();
  const cleanPass = SMTP_PASS.trim();
  
  // Check for placeholder values
  if (cleanUser.includes('your-email') || cleanUser.includes('@example') || 
      cleanPass.includes('your-app-password') || cleanPass.length < 10) {
    console.error('❌ SMTP configuration appears to have placeholder values!');
    console.error('   Please update your .env file with actual credentials.');
    return null;
  }

  try {
    const secure = SMTP_SECURE === 'true' || SMTP_SECURE === true;
    const port = Number(SMTP_PORT);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Creating SMTP transporter...');
    }
    
    const transport = nodemailer.createTransport({
      host: SMTP_HOST.trim(),
      port: port,
      secure: secure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      // Add connection timeout
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Add debug option
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });
    
    // Verify connection on startup (async, don't block)
    transport.verify((error) => {
      if (error) {
        console.error('❌ SMTP verification failed:', error.message);
      } else if (process.env.NODE_ENV === 'development') {
        console.log('✅ SMTP configured successfully');
      }
    });
    
    return transport;
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
    console.error('   Full error:', error);
    return null;
  }
})();

const sendBookingEmail = async ({ to, subject, html }) => {
  console.log(`\n📧 ========== sendBookingEmail CALLED ==========`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Transporter exists: ${transporter ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Transporter type: ${typeof transporter}`);
  
  if (!transporter) {
    console.error(`❌ SMTP transporter is NULL! Email not sent to: ${to}`);
    return { success: false, error: 'SMTP not configured', messageId: null };
  }
  
  // Validate email address
  if (!to) {
    console.error(`❌ Email address is NULL or undefined!`);
    return { success: false, error: 'Email address is required', messageId: null };
  }

  if (typeof to !== 'string' || !to.includes('@')) {
    console.error(`❌ Invalid email address format: ${to} (type: ${typeof to})`);
    return { success: false, error: `Invalid email address: ${to}`, messageId: null };
  }

  // Trim and validate email format more strictly
  const trimmedEmail = to.trim();
  if (!trimmedEmail || trimmedEmail.length < 5 || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    console.error(`❌ Invalid email address format: ${trimmedEmail}`);
    return { success: false, error: `Invalid email address format: ${trimmedEmail}`, messageId: null };
  }
  
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || `"Parking Management" <${process.env.SMTP_USER || 'no-reply@parking.example'}>`,
      to: trimmedEmail,
      subject: subject,
      html: html,
    };
    
    console.log(`📧 Attempting to send email...`);
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   To: ${mailOptions.to}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully!`);
    console.log(`   To: ${to}`);
    console.log(`   Message ID: ${info.messageId || 'N/A'}`);
    console.log(`   Response: ${info.response || 'N/A'}`);
    if (info.accepted && info.accepted.length > 0) {
      console.log(`   Accepted: ${info.accepted.join(', ')}`);
    }
    if (info.rejected && info.rejected.length > 0) {
      console.log(`   Rejected: ${info.rejected.join(', ')}`);
    }
    
    return { success: true, error: null, messageId: info.messageId };
  } catch (err) {
    // Provide more specific error messages
    let errorMessage = err.message;
    if (err.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check your SMTP credentials (App Password).';
    } else if (err.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Check your internet connection and SMTP settings.';
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Check your SMTP host and port.';
    }
    
    console.error(`❌ Email send failed to ${to}:`);
    console.error(`   Error: ${errorMessage}`);
    console.error(`   Code: ${err.code || 'N/A'}`);
    if (err.response) {
      console.error(`   SMTP Response: ${err.response}`);
    }
    if (err.responseCode) {
      console.error(`   Response Code: ${err.responseCode}`);
    }
    return { success: false, error: errorMessage, messageId: null };
  }
};

// Helper: check overlap
const hasOverlap = async ({ spotId, startTime, endTime, excludeBookingId = null }) => {
  try {
    // Ensure spotId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(spotId)) {
      return false;
    }
    
    const query = {
      parkingSpot: new mongoose.Types.ObjectId(spotId),
      status: { $in: ['booked', 'pending'] },
      startTime: { $lt: new Date(endTime) },
      endTime: { $gt: new Date(startTime) },
    };
    
    // Exclude current booking if provided
    if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }
    
    const conflict = await Booking.exists(query);
    return Boolean(conflict);
  } catch (error) {
    console.error('Error checking overlap:', error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { parkingSpotId, startTime, endTime, vehicle, priceOverride } = req.body;
    if (!parkingSpotId) {
      return res.status(400).json({ message: 'parkingSpotId is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid startTime or endTime' });
    }
    
    // Prevent booking past dates
    if (start < now) {
      return res.status(400).json({ message: 'Start time cannot be in the past. Please select today or a future date.' });
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
    const durationHours = Math.max(durationMs / (1000 * 60 * 60), 0.5);
    const surgePercent = Number(process.env.SURGE_PERCENT || 20);
    const surgeWindows = (process.env.SURGE_HOURS || '08:00-10:00,17:00-19:00').split(',').map(w=>w.split('-'));
    const hasSurge = (() => {
      const st = start;
      const en = end;
      return surgeWindows.some(([a,b]) => {
        const [ah,am] = a.split(':').map(Number);
        const [bh,bm] = b.split(':').map(Number);
        const s = new Date(st);
        const e = new Date(st);
        s.setHours(ah,am||0,0,0);
        e.setHours(bh,bm||0,0,0);
        return st < e && en > s;
      });
    })();
    const mult = hasSurge ? 1 + surgePercent/100 : 1;
    const effectiveRate = Number(((spot.pricePerHour || 0) * mult).toFixed(2));
    const price = priceOverride !== undefined
      ? Number(priceOverride)
      : Number((durationHours * effectiveRate).toFixed(2));

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

    return res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (err) {
    console.error('Create booking error:', err.message);
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

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const bookings = await Booking.find({ 
      user: new mongoose.Types.ObjectId(userId) 
    })
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      bookings,
      count: bookings.length,
    });
  } catch (err) {
    console.error('Get bookings error:', err.message);
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
    // Use try-catch to handle any casting errors gracefully
    let bookings;
    
    try {
      bookings = await Booking.find({ 
        status: { $in: ['pending', 'search_query'] }
      })
        .populate({
          path: 'user',
          select: 'name email phone',
          model: 'User'
        })
        .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour vehicleType')
        .sort({ createdAt: -1 });
    } catch (populateErr) {
      // If populate fails due to invalid ObjectId, use lean and filter manually
      if (populateErr.message && populateErr.message.includes('Cast to ObjectId failed')) {
        console.warn('⚠️  Some bookings have invalid user IDs, using fallback query...');
        const allBookings = await Booking.find({ 
          status: { $in: ['pending', 'search_query'] }
        })
          .sort({ createdAt: -1 })
          .lean();
        
        // Filter out invalid user IDs
        const validBookingIds = allBookings
          .filter(b => {
            if (!b.user) return false;
            const userId = String(b.user);
            return userId !== 'admin_hardcoded' && mongoose.Types.ObjectId.isValid(userId);
          })
          .map(b => b._id);
        
        // Get and populate only valid bookings
        bookings = await Booking.find({
          _id: { $in: validBookingIds }
        })
          .populate({
            path: 'user',
            select: 'name email phone',
            model: 'User'
          })
          .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour vehicleType')
          .sort({ createdAt: -1 });
      } else {
        throw populateErr;
      }
    }
    
    // Filter out any bookings where user population failed (user doesn't exist)
    const validBookings = bookings.filter(booking => {
      return booking.user && booking.user._id && String(booking.user._id) !== 'admin_hardcoded';
    });

    return res.status(200).json({
      bookings: validBookings,
      count: validBookings.length,
    });
  } catch (err) {
    console.error('Get pending bookings error:', err.message);
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
    
    console.log(`\n🔔 Approve booking called for ID: ${req.params.id}`);
    console.log(`   Booking found: ${booking ? 'YES' : 'NO'}`);
    if (booking) {
      console.log(`   Booking status: ${booking.status}`);
      console.log(`   User populated: ${booking.user ? 'YES' : 'NO'}`);
      if (booking.user) {
        console.log(`   User type: ${typeof booking.user}`);
        console.log(`   User ID: ${booking.user._id || booking.user}`);
        console.log(`   User email: ${booking.user.email || 'MISSING'}`);
        console.log(`   User name: ${booking.user.name || 'MISSING'}`);
      } else {
        console.error(`   ❌ User is NULL or not populated!`);
        console.log(`   Raw user field: ${JSON.stringify(booking.user)}`);
      }
    }

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
      // Check spot availability for the requested parking lot name
      // Support both parkingLotName (new) and location (legacy) for backward compatibility
      const requestedParkingLotName = (booking.parkingLotName || booking.location)?.trim();
      if (!requestedParkingLotName) {
        return res.status(400).json({ 
          message: 'Cannot approve booking without a parking lot name specified' 
        });
      }

      // Count total spots at this parking lot name (case-insensitive)
      // Search by parkingLotName field in ParkingSpot model
      const totalSpots = await ParkingSpot.countDocuments({ 
        parkingLotName: { $regex: new RegExp(`^${requestedParkingLotName}$`, 'i') }
      });
      
      if (totalSpots === 0) {
        return res.status(409).json({ 
          message: `No parking spots available at "${requestedParkingLotName}". Do you want to add more spots?`,
          code: 'NO_SPOTS_AT_PARKING_LOT',
          parkingLotName: requestedParkingLotName,
          suggestion: 'add_spots'
        });
      }

      // Count how many bookings are already approved/booked for this parking lot name
      // Use case-insensitive parking lot name matching
      const parkingLotNameRegex = new RegExp(`^${requestedParkingLotName}$`, 'i');
      let bookedCount = 0;
      
      if (booking.startTime && booking.endTime) {
        // Count bookings with overlapping time periods
        // Check both parkingLotName and location fields for backward compatibility
        bookedCount = await Booking.countDocuments({
          $or: [
            { status: 'booked', parkingLotName: parkingLotNameRegex },
            { status: 'approved', parkingLotName: parkingLotNameRegex },
            { status: 'booked', location: parkingLotNameRegex },
            { status: 'approved', location: parkingLotNameRegex }
          ],
          startTime: { $lt: new Date(booking.endTime) },
          endTime: { $gt: new Date(booking.startTime) },
          _id: { $ne: booking._id } // Exclude current booking
        });
      } else {
        // If no time specified, count all approved/booked bookings for this parking lot name
        bookedCount = await Booking.countDocuments({
          $or: [
            { status: 'booked', parkingLotName: parkingLotNameRegex },
            { status: 'approved', parkingLotName: parkingLotNameRegex },
            { status: 'booked', location: parkingLotNameRegex },
            { status: 'approved', location: parkingLotNameRegex }
          ],
          _id: { $ne: booking._id }
        });
      }

      // Check if spots are available
      const availableSpots = totalSpots - bookedCount;
      
      console.log('📊 Spot availability check:', {
        parkingLotName: requestedParkingLotName,
        totalSpots: totalSpots,
        bookedCount: bookedCount,
        availableSpots: availableSpots,
        bookingId: booking._id
      });
      
      if (availableSpots <= 0) {
        return res.status(409).json({ 
          message: `All ${totalSpots} spot(s) at "${requestedParkingLotName}" are already booked. Do you want to add more spots?`,
          code: 'NO_AVAILABLE_SPOTS',
          parkingLotName: requestedParkingLotName,
          totalSpots: totalSpots,
          bookedSpots: bookedCount,
          suggestion: 'add_spots'
        });
      }

      // Store user email and name BEFORE saving (populated fields may be lost after save)
      let userEmail = booking.user?.email;
      const userName = booking.user?.name;

      // If email is missing, try to get it from the user ID
      if (!userEmail && booking.user) {
        console.warn(`⚠️  Email not found in populated user, trying to fetch from database...`);
        const userId = booking.user._id || booking.user;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          const userDoc = await User.findById(userId).select('email name');
          if (userDoc) {
            userEmail = userDoc.email;
            console.log(`   ✅ Found email in database: ${userEmail}`);
          } else {
            console.error(`   ❌ User document not found in database for ID: ${userId}`);
          }
        } else {
          console.error(`   ❌ Invalid user ID: ${userId}`);
        }
      }

      if (!userEmail) {
        console.error(`❌ Cannot send email - user email is missing!`);
        console.error(`   Booking ID: ${booking._id}`);
        console.error(`   User object: ${JSON.stringify(booking.user)}`);
        return res.status(400).json({ 
          message: 'Cannot send approval email - user email is missing. Please ensure the user has an email address in their profile.',
          booking 
        });
      }

      // For search queries, mark as approved (admin will assign spot later)
      booking.status = 'approved';
      await booking.save();

      // Send approval email for search query
      console.log(`\n🔔 Approving search query - preparing to send email:`);
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   User: ${userName || 'N/A'}`);
      console.log(`   User Email: ${userEmail}`);
      
      console.log(`\n📬 About to call sendBookingEmail for search query approval:`);
      console.log(`   Email address: ${userEmail}`);
      console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
      
      const emailResult = await sendBookingEmail({
        to: userEmail,
        subject: 'Your parking spot request has been approved',
        html: `
          <h2>Request Approved</h2>
          <p>Hi ${userName || ''},</p>
          <p>Your parking spot request has been approved by the admin.</p>
          <ul>
            <li><strong>Parking Lot Name:</strong> ${booking.parkingLotName || booking.location || 'N/A'}</li>
            <li><strong>Vehicle Type:</strong> ${booking.vehicleType || 'N/A'}</li>
            ${booking.startTime ? `<li><strong>From:</strong> ${new Date(booking.startTime).toLocaleString()}</li>` : ''}
            ${booking.endTime ? `<li><strong>To:</strong> ${new Date(booking.endTime).toLocaleString()}</li>` : ''}
          </ul>
          <p>We will contact you shortly with spot assignment details.</p>
          <p>Thank you for choosing our service.</p>
        `,
      });
      
      // Update booking with email status
      booking.emailSent = emailResult.success;
      booking.emailSentAt = emailResult.success ? new Date() : null;
      booking.emailError = emailResult.success ? null : emailResult.error;
      await booking.save();
      
      if (!emailResult.success && emailResult.error !== 'SMTP not configured') {
        console.error('Email send failed:', emailResult.error);
      }

      return res.status(200).json({
        message: emailResult.success 
          ? 'Search query approved successfully. Confirmation email has been sent to the user.'
          : 'Search query approved successfully.',
        booking,
        availableSpots: availableSpots - 1, // Remaining after this approval
        totalSpots: totalSpots,
        emailSent: emailResult.success,
        emailError: emailResult.success ? null : emailResult.error
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

    // Store user email and name BEFORE saving (populated fields may be lost after save)
    let userEmail = booking.user?.email;
    const userName = booking.user?.name;

    // If email is missing, try to get it from the user ID
    if (!userEmail && booking.user) {
      console.warn(`⚠️  Email not found in populated user, trying to fetch from database...`);
      const userId = booking.user._id || booking.user;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const userDoc = await User.findById(userId).select('email name');
        if (userDoc) {
          userEmail = userDoc.email;
          console.log(`   ✅ Found email in database: ${userEmail}`);
        } else {
          console.error(`   ❌ User document not found in database for ID: ${userId}`);
        }
      } else {
        console.error(`   ❌ Invalid user ID: ${userId}`);
      }
    }

    if (!userEmail) {
      console.error(`❌ Cannot send email - user email is missing!`);
      console.error(`   Booking ID: ${booking._id}`);
      console.error(`   User object: ${JSON.stringify(booking.user)}`);
      return res.status(400).json({ 
        message: 'Cannot send confirmation email - user email is missing. Please ensure the user has an email address in their profile.',
        booking 
      });
    }

    // Update status to 'booked' (approved)
    booking.status = 'booked';
    await booking.save();

    // Send confirmation email to user
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    console.log(`\n🔔 Approving booking - preparing to send email:`);
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   User: ${userName || 'N/A'}`);
    console.log(`   User Email: ${userEmail}`);
    
    console.log(`\n📬 About to call sendBookingEmail for approval:`);
    console.log(`   Email address: ${userEmail}`);
    console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
    
    const emailResult = await sendBookingEmail({
      to: userEmail,
      subject: 'Your parking spot booking is confirmed',
      html: `
        <h2>Booking Confirmed</h2>
        <p>Hi ${userName || ''},</p>
        <p>Your parking spot reservation has been approved and confirmed.</p>
        <ul>
          <li><strong>Spot:</strong> ${booking.parkingSpot.parkingLotName || booking.parkingSpot.parkinglotName || 'N/A'} - ${booking.parkingSpot.spotNum}</li>
          <li><strong>Parking Lot Name:</strong> ${booking.parkingSpot.parkingLotName || booking.parkingSpot.parkinglotName || 'N/A'}</li>
          <li><strong>Area:</strong> ${booking.parkingSpot.location || 'N/A'}</li>
          <li><strong>From:</strong> ${start.toLocaleString()}</li>
          <li><strong>To:</strong> ${end.toLocaleString()}</li>
          <li><strong>Price:</strong> ৳${booking.price}</li>
        </ul>
        <p>Thank you for choosing our service.</p>
      `,
    });
    
    // Update booking with email status
    booking.emailSent = emailResult.success;
    booking.emailSentAt = emailResult.success ? new Date() : null;
    booking.emailError = emailResult.success ? null : emailResult.error;
    await booking.save();
    
      if (!emailResult.success && emailResult.error !== 'SMTP not configured') {
        console.error('Email send failed:', emailResult.error);
      }

    return res.status(200).json({
      message: emailResult.success 
        ? 'Booking approved successfully. Confirmation email has been sent to the user.'
        : 'Booking approved successfully.',
      booking,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error
    });
  } catch (err) {
    console.error('Approve booking error:', err.message);
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
    
    console.log(`\n🔔 Reject booking called for ID: ${req.params.id}`);
    console.log(`   Booking found: ${booking ? 'YES' : 'NO'}`);
    if (booking) {
      console.log(`   Booking status: ${booking.status}`);
      console.log(`   User populated: ${booking.user ? 'YES' : 'NO'}`);
      if (booking.user) {
        console.log(`   User type: ${typeof booking.user}`);
        console.log(`   User ID: ${booking.user._id || booking.user}`);
        console.log(`   User email: ${booking.user.email || 'MISSING'}`);
        console.log(`   User name: ${booking.user.name || 'MISSING'}`);
      } else {
        console.error(`   ❌ User is NULL or not populated!`);
        console.log(`   Raw user field: ${JSON.stringify(booking.user)}`);
      }
    }

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
    
    // Store user email and name BEFORE saving (populated fields may be lost after save)
    let userEmail = booking.user?.email;
    const userName = booking.user?.name;

    // If email is missing, try to get it from the user ID
    if (!userEmail && booking.user) {
      console.warn(`⚠️  Email not found in populated user, trying to fetch from database...`);
      const userId = booking.user._id || booking.user;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const userDoc = await User.findById(userId).select('email name');
        if (userDoc) {
          userEmail = userDoc.email;
          console.log(`   ✅ Found email in database: ${userEmail}`);
        } else {
          console.error(`   ❌ User document not found in database for ID: ${userId}`);
        }
      } else {
        console.error(`   ❌ Invalid user ID: ${userId}`);
      }
    }

    if (!userEmail) {
      console.error(`❌ Cannot send email - user email is missing!`);
      console.error(`   Booking ID: ${booking._id}`);
      console.error(`   User object: ${JSON.stringify(booking.user)}`);
      return res.status(400).json({ 
        message: 'Cannot send rejection email - user email is missing. Please ensure the user has an email address in their profile.',
        booking 
      });
    }
    
    booking.status = 'rejected';
    await booking.save();

    // Send rejection email to user immediately
    console.log(`\n🔔 Rejecting booking - preparing to send email:`);
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   User: ${userName || 'N/A'}`);
    console.log(`   User Email: ${userEmail}`);
    
    console.log(`\n📬 About to call sendBookingEmail for rejection:`);
    console.log(`   Email address: ${userEmail}`);
    console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
    
    const emailResult = await sendBookingEmail({
      to: userEmail,
      subject: 'Your parking spot booking request has been rejected',
      html: `
        <h2>Booking Request Rejected</h2>
        <p>Hi ${userName || 'User'},</p>
        <p>We regret to inform you that your parking spot reservation request has been rejected by the administrator.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0;">Request Details:</h3>
          <ul style="list-style: none; padding: 0;">
            ${isSearchQuery 
              ? `<li style="margin: 8px 0;"><strong>Parking Lot Name:</strong> ${booking.parkingLotName || booking.location || 'N/A'}</li>
                 <li style="margin: 8px 0;"><strong>Vehicle Type:</strong> ${booking.vehicleType || 'N/A'}</li>
                 ${booking.startTime ? `<li style="margin: 8px 0;"><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>` : ''}
                 ${booking.endTime ? `<li style="margin: 8px 0;"><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>` : ''}
                 ${booking.date ? `<li style="margin: 8px 0;"><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</li>` : ''}`
               : `<li style="margin: 8px 0;"><strong>Spot:</strong> ${(booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || 'N/A')} - ${booking.parkingSpot?.spotNum || 'N/A'}</li>
                 <li style="margin: 8px 0;"><strong>Parking Lot Name:</strong> ${booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || 'N/A'}</li>
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
    
    // Update booking with email status
    booking.emailSent = emailResult.success;
    booking.emailSentAt = emailResult.success ? new Date() : null;
    booking.emailError = emailResult.success ? null : emailResult.error;
    await booking.save();
    
      if (!emailResult.success && emailResult.error !== 'SMTP not configured') {
        console.error('Email send failed:', emailResult.error);
      }

    return res.status(200).json({
      message: emailResult.success 
        ? 'Booking rejected successfully. Rejection email has been sent to the user.'
        : 'Booking rejected successfully.',
      booking,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error
    });
  } catch (err) {
    console.error('Reject booking error:', err.message);
    return res.status(500).json({ 
      message: 'Server error while rejecting booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Test email sending (for debugging)
// @route   POST /api/bookings/test-email
// @access  Private/Admin
export const testEmail = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ message: 'Test email address is required' });
    }
    
    const emailResult = await sendBookingEmail({
      to: testEmail,
      subject: 'Test Email - Parking Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Test Email</h2>
          <p>This is a test email from the Parking Management System.</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <p><strong>Time sent:</strong> ${new Date().toLocaleString()}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated test email. Please do not reply.</p>
        </div>
      `,
    });
    
    if (emailResult.success) {
      return res.status(200).json({
        message: 'Test email sent successfully!',
        emailSent: true,
        messageId: emailResult.messageId,
      });
    } else {
      return res.status(500).json({
        message: 'Failed to send test email',
        error: emailResult.error,
        emailSent: false,
      });
    }
  } catch (err) {
    console.error('Test email error:', err.message);
    return res.status(500).json({
      message: 'Server error while sending test email',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};


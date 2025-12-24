import Booking from '../models/Booking.js';
import ParkingSpot from '../models/ParkingSpots.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { getOrCreateStripeCustomer, attachPaymentMethod, chargePaymentMethod, calculateParkingFee } from '../utils/payment.js';

// Build a mail transporter if SMTP env vars are set (lazy initialization)
let _transporterInstance = null;

const getTransporter = () => {
  // Return cached instance if already created
  if (_transporterInstance !== null) {
    return _transporterInstance;
  }

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
    _transporterInstance = null;
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
    _transporterInstance = null;
    return null;
  }

  try {
    const secure = SMTP_SECURE === 'true' || SMTP_SECURE === true;
    const port = Number(SMTP_PORT);
    
    console.log('🔄 Creating SMTP transporter...');
    console.log(`   Host: ${SMTP_HOST}`);
    console.log(`   Port: ${port}`);
    console.log(`   Secure: ${secure}`);
    console.log(`   User: ${cleanUser}`);
    
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
        console.error('   This might affect email sending. Check your SMTP credentials.');
      } else {
        console.log('✅ SMTP configured successfully');
      }
    });
    
    _transporterInstance = transport;
    return transport;
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
    console.error('   Full error:', error);
    _transporterInstance = null;
    return null;
  }
};

// For backward compatibility, export a getter
const transporter = getTransporter;

const sendBookingEmail = async ({ to, subject, html }) => {
  console.log(`\n📧 ========== sendBookingEmail CALLED ==========`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  
  // Get transporter (lazy initialization)
  const transporter = getTransporter();
  console.log(`   Transporter exists: ${transporter ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Transporter type: ${typeof transporter}`);
  
  if (!transporter) {
    console.error(`❌ SMTP transporter is NULL! Email not sent to: ${to}`);
    console.error(`   Please check your SMTP configuration in .env file`);
    console.error(`   Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS`);
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
        status: { $in: ['pending', 'search_query', 'approved', 'booked'] }
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
          status: { $in: ['pending', 'search_query', 'approved', 'booked'] }
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

      // For search queries, mark as approved (admin will assign spot later)
      // Approve the booking FIRST, then try to send email
      booking.status = 'approved';
      await booking.save();

      // Send approval email for search query (optional - don't block approval if email fails)
      let emailResult = { success: false, error: 'Email not sent' };
      
      if (userEmail) {
        console.log(`\n🔔 Approving search query - preparing to send email:`);
        console.log(`   Booking ID: ${booking._id}`);
        console.log(`   User: ${userName || 'N/A'}`);
        console.log(`   User Email: ${userEmail}`);
        
        console.log(`\n📬 About to call sendBookingEmail for search query approval:`);
        console.log(`   Email address: ${userEmail}`);
        console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
        
        emailResult = await sendBookingEmail({
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
      } else {
        console.warn(`⚠️  User email not available - booking approved but email not sent`);
        console.warn(`   Booking ID: ${booking._id}`);
        console.warn(`   User: ${userName || 'N/A'}`);
      }
      
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

    // Update status to 'booked' (approved)
    // Approve the booking FIRST, then try to send email
    booking.status = 'booked';
    await booking.save();

    // Send confirmation email to user (optional - don't block approval if email fails)
    let emailResult = { success: false, error: 'Email not sent' };
    
    if (userEmail) {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      
      console.log(`\n🔔 Approving booking - preparing to send email:`);
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   User: ${userName || 'N/A'}`);
      console.log(`   User Email: ${userEmail}`);
      
      console.log(`\n📬 About to call sendBookingEmail for approval:`);
      console.log(`   Email address: ${userEmail}`);
      console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
      
      emailResult = await sendBookingEmail({
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
    } else {
      console.warn(`⚠️  User email not available - booking approved but email not sent`);
      console.warn(`   Booking ID: ${booking._id}`);
      console.warn(`   User: ${userName || 'N/A'}`);
    }
    
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

    // Reject the booking FIRST, then try to send email
    booking.status = 'rejected';
    await booking.save();

    // Send rejection email to user (optional - don't block rejection if email fails)
    let emailResult = { success: false, error: 'Email not sent' };
    
    if (userEmail) {
      console.log(`\n🔔 Rejecting booking - preparing to send email:`);
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   User: ${userName || 'N/A'}`);
      console.log(`   User Email: ${userEmail}`);
      
      console.log(`\n📬 About to call sendBookingEmail for rejection:`);
      console.log(`   Email address: ${userEmail}`);
      console.log(`   Transporter available: ${transporter ? 'YES ✅' : 'NO ❌'}`);
      
      emailResult = await sendBookingEmail({
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
    } else {
      console.warn(`⚠️  User email not available - booking rejected but email not sent`);
      console.warn(`   Booking ID: ${booking._id}`);
      console.warn(`   User: ${userName || 'N/A'}`);
    }
    
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

// @desc    Record vehicle entry time
// @route   POST /api/bookings/:id/entry
// @access  Private/Admin
export const recordEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { entryTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(id).populate('parkingSpot');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is approved
    if (booking.status !== 'approved' && booking.status !== 'booked') {
      return res.status(400).json({ 
        message: `Cannot record entry for booking with status: ${booking.status}. Booking must be approved or booked.` 
      });
    }

    // Check if entry already recorded
    if (booking.actualEntryTime) {
      return res.status(400).json({ 
        message: 'Entry time already recorded',
        entryTime: booking.actualEntryTime
      });
    }

    // Use provided time or current time
    const entry = entryTime ? new Date(entryTime) : new Date();
    
    if (isNaN(entry.getTime())) {
      return res.status(400).json({ message: 'Invalid entry time' });
    }

    booking.actualEntryTime = entry;
    booking.status = 'booked'; // Update status to booked when vehicle enters
    await booking.save();

    return res.status(200).json({
      message: 'Entry time recorded successfully',
      booking: {
        _id: booking._id,
        actualEntryTime: booking.actualEntryTime,
        status: booking.status
      }
    });
  } catch (err) {
    console.error('Record entry error:', err.message);
    return res.status(500).json({ 
      message: 'Server error while recording entry',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Record vehicle exit time and process payment
// @route   POST /api/bookings/:id/exit
// @access  Private/Admin
export const recordExit = async (req, res) => {
  try {
    const { id } = req.params;
    const { exitTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    // First, get the raw booking to check for parkingSpot ID
    const booking = await Booking.findById(id)
      .populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor pricePerHour')
      .populate('user', 'name email hasPaymentMethod stripeCustomerId paymentMethodId paymentMethodLast4 paymentMethodBrand');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Debug: Log booking and parking spot data
    console.log('\n🔍 Booking Data Check:');
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   Booking parkingSpot (populated): ${booking.parkingSpot ? 'YES' : 'NO'}`);
    
    // Get parking spot - try populated first, then fetch from database
    let parkingSpot = booking.parkingSpot;
    
    // Check if parking spot is actually populated (has _id and other fields)
    if (!parkingSpot || !parkingSpot._id || !parkingSpot.pricePerHour) {
      console.log(`   ⚠️  Parking spot not properly populated, fetching from database...`);
      
      // Get the raw parkingSpot ID from the booking document
      const rawBooking = await Booking.findById(id).select('parkingSpot').lean();
      const parkingSpotId = rawBooking?.parkingSpot;
      
      console.log(`   Raw parkingSpot ID from booking: ${parkingSpotId}`);
      
      if (parkingSpotId && mongoose.Types.ObjectId.isValid(parkingSpotId)) {
        try {
          parkingSpot = await ParkingSpot.findById(parkingSpotId).select('parkingLotName parkinglotName spotNum location floor pricePerHour');
          if (parkingSpot) {
            console.log(`   ✅ Fetched parking spot from database:`);
            console.log(`      ID: ${parkingSpot._id}`);
            console.log(`      Parking Lot: ${parkingSpot.parkingLotName || parkingSpot.parkinglotName}`);
            console.log(`      Spot: ${parkingSpot.spotNum}`);
            console.log(`      pricePerHour: ৳${parkingSpot.pricePerHour}`);
            // Update booking object with fetched spot
            booking.parkingSpot = parkingSpot;
          } else {
            console.log(`   ❌ Parking spot not found in database with ID: ${parkingSpotId}`);
          }
        } catch (fetchErr) {
          console.error(`   ❌ Error fetching parking spot:`, fetchErr);
        }
      } else {
        console.log(`   ❌ Invalid or missing parking spot ID in booking`);
        
        // If no parkingSpot but booking has parkingLotName (search query), find a spot by name
        if (booking.parkingLotName || booking.location) {
          const parkingLotName = booking.parkingLotName || booking.location;
          console.log(`   🔍 Booking has parkingLotName but no spot - searching for spot by name: "${parkingLotName}"`);
          
          try {
            // Find any spot in this parking lot to get the rate
            const spotByLotName = await ParkingSpot.findOne({
              $or: [
                { parkingLotName: { $regex: new RegExp(`^${parkingLotName}$`, 'i') } },
                { parkinglotName: { $regex: new RegExp(`^${parkingLotName}$`, 'i') } }
              ]
            }).select('parkingLotName parkinglotName spotNum pricePerHour');
            
            if (spotByLotName) {
              parkingSpot = spotByLotName;
              console.log(`   ✅ Found spot by parking lot name:`);
              console.log(`      Parking Lot: ${spotByLotName.parkingLotName || spotByLotName.parkinglotName}`);
              console.log(`      Spot: ${spotByLotName.spotNum}`);
              console.log(`      pricePerHour: ৳${spotByLotName.pricePerHour}`);
              booking.parkingSpot = parkingSpot;
            } else {
              console.log(`   ❌ No spots found for parking lot: "${parkingLotName}"`);
            }
          } catch (searchErr) {
            console.error(`   ❌ Error searching for spot by parking lot name:`, searchErr);
          }
        }
      }
    } else {
      console.log(`   ✅ Parking spot populated successfully`);
      console.log(`      Parking Lot: ${parkingSpot.parkingLotName || parkingSpot.parkinglotName}`);
      console.log(`      Spot: ${parkingSpot.spotNum}`);
      console.log(`      pricePerHour: ৳${parkingSpot.pricePerHour}`);
    }

    // Check if entry was recorded
    if (!booking.actualEntryTime) {
      return res.status(400).json({ 
        message: 'Entry time must be recorded before exit time' 
      });
    }

    // Check if exit already recorded
    if (booking.actualExitTime) {
      return res.status(400).json({ 
        message: 'Exit time already recorded',
        exitTime: booking.actualExitTime,
        actualPrice: booking.actualPrice,
        paymentStatus: booking.paymentStatus
      });
    }

    // Use provided time or current time
    const exit = exitTime ? new Date(exitTime) : new Date();
    
    if (isNaN(exit.getTime())) {
      return res.status(400).json({ message: 'Invalid exit time' });
    }

    if (exit <= booking.actualEntryTime) {
      return res.status(400).json({ 
        message: 'Exit time must be after entry time' 
      });
    }

    // Get parking spot price per hour (each parking lot can have different rates)
    // Use the parking spot we fetched/verified above
    let pricePerHour = null;
    
    // Use parkingSpot variable (which we fetched if needed)
    const spotToUse = parkingSpot || booking.parkingSpot;
    
    if (spotToUse && spotToUse.pricePerHour) {
      pricePerHour = Number(spotToUse.pricePerHour);
      console.log(`\n💰 Fee Calculation:`);
      console.log(`   Parking Lot: ${spotToUse.parkingLotName || spotToUse.parkinglotName || 'Unknown'}`);
      console.log(`   Spot Number: ${spotToUse.spotNum || 'Unknown'}`);
      console.log(`   pricePerHour: ৳${pricePerHour}/hour`);
    } else {
      // Last resort: try to find rate by parking lot name
      const parkingLotName = booking.parkingLotName || booking.location;
      if (parkingLotName) {
        console.log(`\n⚠️  No parking spot found, searching by parking lot name: "${parkingLotName}"`);
        try {
          const anySpot = await ParkingSpot.findOne({
            $or: [
              { parkingLotName: { $regex: new RegExp(`^${parkingLotName}$`, 'i') } },
              { parkinglotName: { $regex: new RegExp(`^${parkingLotName}$`, 'i') } }
            ]
          }).select('pricePerHour parkingLotName').lean();
          
          if (anySpot && anySpot.pricePerHour) {
            pricePerHour = Number(anySpot.pricePerHour);
            console.log(`   ✅ Found rate by parking lot name: ৳${pricePerHour}/hour`);
          } else {
            console.log(`   ❌ No spots found for "${parkingLotName}"`);
            console.log(`   ⚠️  Using default rate: ৳50/hour`);
            pricePerHour = 50;
          }
        } catch (err) {
          console.error(`   ❌ Error searching for rate:`, err);
          console.log(`   ⚠️  Using default rate: ৳50/hour`);
          pricePerHour = 50;
        }
      } else {
        console.log(`\n⚠️  WARNING: Could not get parking spot pricePerHour!`);
        console.log(`   spotToUse:`, spotToUse);
        console.log(`   booking.parkingLotName:`, booking.parkingLotName);
        console.log(`   Using default rate: ৳50/hour`);
        pricePerHour = 50;
      }
    }
    
    console.log(`\n💰 Final Fee Calculation:`);
    console.log(`   Parking Lot: ${booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || 'Unknown'}`);
    console.log(`   Spot Number: ${booking.parkingSpot?.spotNum || 'Unknown'}`);
    console.log(`   Rate per hour: ৳${pricePerHour}`);
    console.log(`   Entry time: ${new Date(booking.actualEntryTime).toLocaleString()}`);
    console.log(`   Exit time: ${new Date(exit).toLocaleString()}`);

    // Calculate actual parking fee based on this parking lot's specific rate
    const actualPrice = calculateParkingFee(
      booking.actualEntryTime,
      exit,
      pricePerHour
    );
    
    // Calculate duration for detailed logging
    const durationMs = exit.getTime() - booking.actualEntryTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const roundedHours = Math.ceil(Math.max(durationHours, 0.5) * 2) / 2;
    
    console.log(`   Duration: ${durationHours.toFixed(4)} hours (${(durationHours * 60).toFixed(2)} minutes)`);
    console.log(`   Rounded duration: ${roundedHours} hours (minimum 0.5 hours)`);
    console.log(`   Calculation: ${roundedHours} hours × ৳${pricePerHour}/hour = ৳${(roundedHours * pricePerHour).toFixed(2)}`);
    console.log(`   Final calculated fee: ৳${actualPrice.toFixed(2)}`);

    booking.actualExitTime = exit;
    booking.actualPrice = actualPrice;

    // Process payment if user has payment method
    const user = booking.user;
    let paymentResult = null;
    let paymentError = null;

    // Debug logging for payment method detection
    console.log('\n💳 Payment Method Check:');
    console.log(`   User exists: ${user ? 'YES' : 'NO'}`);
    if (user) {
      console.log(`   User ID: ${user._id}`);
      console.log(`   hasPaymentMethod: ${user.hasPaymentMethod}`);
      console.log(`   stripeCustomerId: ${user.stripeCustomerId || 'MISSING'}`);
      console.log(`   paymentMethodId: ${user.paymentMethodId || 'MISSING'}`);
      console.log(`   User object keys: ${Object.keys(user).join(', ')}`);
    }

    if (user && user.hasPaymentMethod && user.stripeCustomerId && user.paymentMethodId) {
      console.log('   ✅ Payment method detected - attempting to charge');
      try {
        // Charge the user's saved payment method
        paymentResult = await chargePaymentMethod(
          user.stripeCustomerId,
          user.paymentMethodId,
          actualPrice,
          'bdt',
          {
            bookingId: booking._id.toString(),
            userId: user._id.toString(),
            parkingLot: booking.parkingSpot?.parkingLotName || 'Unknown',
            spotNum: booking.parkingSpot?.spotNum || 'Unknown',
          }
        );

                if (paymentResult && paymentResult.success) {
                  booking.paymentStatus = 'paid';
                  booking.paymentIntentId = paymentResult.paymentIntentId;
                  booking.paymentMethodId = user.paymentMethodId;
                  booking.chargedAt = new Date();
                  booking.paymentError = null;
                  
                  // Log payment details
                  if (paymentResult.originalAmount && paymentResult.originalAmount !== paymentResult.amount) {
                    console.log(`   💰 Payment converted: ৳${paymentResult.originalAmount} BDT → $${paymentResult.amount} USD`);
                  }
                  console.log(`   ✅ Payment successful: ${paymentResult.paymentIntentId}`);
                } else {
                  booking.paymentStatus = 'failed';
                  paymentError = paymentResult?.error || 'Payment processing failed';
                  booking.paymentError = paymentError;
                  console.log(`   ❌ Payment failed: ${paymentError}`);
                }
      } catch (paymentErr) {
        console.error('Payment processing error:', paymentErr);
        booking.paymentStatus = 'failed';
        paymentError = paymentErr.message || 'Payment processing failed';
        booking.paymentError = paymentError;
      }
    } else {
      // No payment method saved
      console.log('   ❌ Payment method not detected');
      if (!user) {
        console.log('   Reason: User object is null');
      } else if (!user.hasPaymentMethod) {
        console.log('   Reason: hasPaymentMethod is false');
      } else if (!user.stripeCustomerId) {
        console.log('   Reason: stripeCustomerId is missing');
      } else if (!user.paymentMethodId) {
        console.log('   Reason: paymentMethodId is missing');
      }
      
      // Try to fetch user from database if populated user doesn't have payment info
      if (user && user._id && (!user.hasPaymentMethod || !user.stripeCustomerId || !user.paymentMethodId)) {
        console.log('   🔍 Attempting to fetch user from database...');
        try {
          const userDoc = await User.findById(user._id).select('hasPaymentMethod stripeCustomerId paymentMethodId paymentMethodLast4 paymentMethodBrand');
          if (userDoc) {
            console.log(`   ✅ Found user in database:`);
            console.log(`      hasPaymentMethod: ${userDoc.hasPaymentMethod}`);
            console.log(`      stripeCustomerId: ${userDoc.stripeCustomerId || 'MISSING'}`);
            console.log(`      paymentMethodId: ${userDoc.paymentMethodId || 'MISSING'}`);
            
            if (userDoc.hasPaymentMethod && userDoc.stripeCustomerId && userDoc.paymentMethodId) {
              console.log('   ✅ Payment method found in database - attempting to charge');
              try {
                paymentResult = await chargePaymentMethod(
                  userDoc.stripeCustomerId,
                  userDoc.paymentMethodId,
                  actualPrice,
                  'bdt',
                  {
                    bookingId: booking._id.toString(),
                    userId: userDoc._id.toString(),
                    parkingLot: booking.parkingSpot?.parkingLotName || 'Unknown',
                    spotNum: booking.parkingSpot?.spotNum || 'Unknown',
                  }
                );

                if (paymentResult && paymentResult.success) {
                  booking.paymentStatus = 'paid';
                  booking.paymentIntentId = paymentResult.paymentIntentId;
                  booking.paymentMethodId = userDoc.paymentMethodId;
                  booking.chargedAt = new Date();
                  booking.paymentError = null;
                  paymentError = null;
                  console.log(`   ✅ Payment successful: ${paymentResult.paymentIntentId}`);
                } else {
                  booking.paymentStatus = 'failed';
                  paymentError = paymentResult?.error || 'Payment processing failed';
                  booking.paymentError = paymentError;
                  console.log(`   ❌ Payment failed: ${paymentError}`);
                }
              } catch (paymentErr) {
                console.error('Payment processing error:', paymentErr);
                booking.paymentStatus = 'failed';
                paymentError = paymentErr.message || 'Payment processing failed';
                booking.paymentError = paymentError;
              }
            } else {
              booking.paymentStatus = 'pending';
              paymentError = 'No payment method saved. Payment will be processed manually.';
            }
          }
        } catch (dbErr) {
          console.error('Error fetching user from database:', dbErr);
          booking.paymentStatus = 'pending';
          paymentError = 'No payment method saved. Payment will be processed manually.';
        }
      } else {
        booking.paymentStatus = 'pending';
        paymentError = 'No payment method saved. Payment will be processed manually.';
      }
    }

    booking.status = 'completed';
    await booking.save();

    // Send confirmation email
    try {
      const userEmail = user?.email || 'unknown@example.com';
      const userName = user?.name || 'User';
      const parkingLotName = booking.parkingSpot?.parkingLotName || 'Unknown';
      const spotNum = booking.parkingSpot?.spotNum || 'Unknown';
      
      const durationMs = exit.getTime() - booking.actualEntryTime.getTime();
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
      
      const emailResult = await sendBookingEmail({
        to: userEmail,
        subject: `Parking Session Completed - ${parkingLotName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Parking Session Completed</h2>
            <p>Hello ${userName},</p>
            <p>Your parking session has been completed. Here are the details:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Parking Lot:</strong> ${parkingLotName}</p>
              <p><strong>Spot Number:</strong> ${spotNum}</p>
              <p><strong>Entry Time:</strong> ${new Date(booking.actualEntryTime).toLocaleString()}</p>
              <p><strong>Exit Time:</strong> ${new Date(exit).toLocaleString()}</p>
              <p><strong>Duration:</strong> ${durationHours} hours</p>
            <p><strong>Total Amount:</strong> ৳${actualPrice.toFixed(2)}</p>
            <p><strong>Payment Status:</strong> ${booking.paymentStatus === 'paid' ? '✅ Paid Automatically' : booking.paymentStatus === 'failed' ? '❌ Payment Failed' : '⏳ Pending Manual Payment'}</p>
            ${booking.paymentStatus === 'pending' ? '<p style="color: #6b7280; font-size: 14px;">💡 Payment will be processed manually. Please contact support if needed.</p>' : ''}
          </div>
          ${paymentError ? `<p style="color: #dc2626;">⚠️ ${paymentError}</p>` : ''}
            <p>Thank you for using our parking service!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
          </div>
        `,
      });
      
      if (!emailResult.success && emailResult.error !== 'SMTP not configured') {
        console.error('Failed to send exit confirmation email:', emailResult.error);
      }
    } catch (emailErr) {
      console.error('Error sending exit confirmation email:', emailErr);
    }

    return res.status(200).json({
      message: 'Exit time recorded successfully',
      booking: {
        _id: booking._id,
        actualEntryTime: booking.actualEntryTime,
        actualExitTime: booking.actualExitTime,
        actualPrice: booking.actualPrice,
        paymentStatus: booking.paymentStatus,
        paymentIntentId: booking.paymentIntentId,
        chargedAt: booking.chargedAt,
      },
      payment: paymentResult,
      paymentError: paymentError,
    });
  } catch (err) {
    console.error('Record exit error:', err.message);
    return res.status(500).json({ 
      message: 'Server error while recording exit',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


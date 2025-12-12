import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Fine from './models/Fine.js';
import Booking from './models/Booking.js';
import User from './models/User.js'; // Add this import

dotenv.config();

const runFineCheck = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const now = new Date();
    console.log(`\n🕒 Current time: ${now}`);
    
    // Find bookings that should be fined - DON'T populate user
    const overtimeBookings = await Booking.find({
      paidUntil: { $lt: now },
      fineIssued: false,
      status: { $in: ['booked', 'completed'] }
    }); // Removed .populate('user')

    console.log(`📊 Found ${overtimeBookings.length} bookings that need fines\n`);

    for (const booking of overtimeBookings) {
      console.log(`📝 Processing booking: ${booking._id}`);
      console.log(`   License Plate: ${booking.vehicle?.licensePlate}`);
      console.log(`   Paid Until: ${booking.paidUntil}`);
      console.log(`   User ID: ${booking.user}`);

      // Calculate overtime
      const overtimeMs = now - new Date(booking.paidUntil);
      const overtimeHours = Math.ceil(overtimeMs / (1000 * 60 * 60));
      const fineAmount = overtimeHours * 10;

      console.log(`   Overtime: ${overtimeHours} hours`);
      console.log(`   Fine Amount: $${fineAmount}`);

      // Create fine - Use booking.user (which is the ObjectId)
      const fine = new Fine({
        bookingId: booking._id,
        userId: booking.user, // This is the ObjectId
        licensePlate: booking.vehicle?.licensePlate || 'Unknown',
        checkInTime: booking.startTime,
        paidUntil: booking.paidUntil,
        actualExitTime: now,
        overtimeHours,
        hourlyRate: 10,
        fineAmount,
        status: 'issued'
      });

      await fine.save();
      
      // Update booking
      booking.fineIssued = true;
      booking.fineId = fine._id;
      await booking.save();

      console.log(`   ✅ Fine created: ${fine._id}\n`);
    }

    console.log('🎉 Fine check completed successfully!');
    
    // Show summary
    const fines = await Fine.find();
    console.log(`\n💰 Total fines in system: ${fines.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

runFineCheck();
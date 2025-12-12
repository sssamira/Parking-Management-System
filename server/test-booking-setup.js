import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/Booking.js';
import User from './models/User.js';

dotenv.config();

const setupTestBooking = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a user (non-admin)
    const user = await User.findOne({ role: { $ne: 'admin' } });
    if (!user) {
      console.error('❌ No non-admin user found. Create a regular user first.');
      return;
    }

    // Create a test booking with expired paidUntil
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const testBooking = new Booking({
      user: user._id,
      vehicle: {
        licensePlate: 'TEST-FINE-001',
        carType: 'Car'
      },
      parkingLotName: 'Test Parking Lot',
      startTime: threeHoursAgo,
      endTime: twoHoursAgo,
      paidUntil: twoHoursAgo, // This is expired (2 hours ago)
      status: 'booked',
      fineIssued: false,
      price: 15.00
    });

    await testBooking.save();
    console.log('✅ Test booking created:');
    console.log(`   Booking ID: ${testBooking._id}`);
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   License Plate: TEST-FINE-001`);
    console.log(`   Paid Until: ${twoHoursAgo}`);
    console.log(`   Status: ${testBooking.status}`);
    console.log(`   Fine Issued: ${testBooking.fineIssued}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

setupTestBooking();
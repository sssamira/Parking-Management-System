import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingLot from '../models/ParkingLot.js';
import ParkingSpots from '../models/ParkingSpots.js';

dotenv.config();

const seedParkingLots = [
  // Your 7 Dhaka parking lots
  {
    name: "Bashundhara City",
    address: "Bashundhara City Shopping Complex, Panthapath, Dhaka",
    location: "Panthapath",
    latitude: 23.7551,
    longitude: 90.3839,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "roofed", "valet"],
    openingHours: { open: "10:00", close: "22:00" }
  },
  // ... add all 7 lots from your seedParkingLots.js
];

const initDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if database is already initialized
    const existingLots = await ParkingLot.countDocuments();
    
    if (existingLots > 0) {
      console.log(`📊 Database already has ${existingLots} parking lots. Skipping seed.`);
      return;
    }
    
    console.log('🌱 Initializing database with sample data...');
    
    // Clear existing data (optional - be careful in production!)
    // await ParkingLot.deleteMany({});
    // await ParkingSpots.deleteMany({});
    
    // Insert parking lots
    const createdLots = await ParkingLot.insertMany(seedParkingLots);
    console.log(`✅ Added ${createdLots.length} parking lots`);
    
    // Create parking spots for each lot (optional)
    const parkingSpots = [];
    for (const lot of createdLots) {
      // Create 50 spots for each lot (adjust as needed)
      for (let i = 1; i <= 50; i++) {
        parkingSpots.push({
          spotNum: i.toString(),
          parkingLotName: lot.name,
          location: lot.location,
          pricePerHour: lot.type === 'paid' ? 50 : 0,
          isAvailable: true,
          vehicleType: 'car'
        });
      }
    }
    
    if (parkingSpots.length > 0) {
      await ParkingSpots.insertMany(parkingSpots);
      console.log(`✅ Added ${parkingSpots.length} parking spots`);
    }
    
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the initialization
initDatabase();
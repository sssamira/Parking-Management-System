// server/scripts/reset-database_ForLots.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingLot from '../models/ParkingLot.js';
import ParkingSpots from '../models/ParkingSpots.js';

dotenv.config();

async function resetDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🗑️  Resetting parking data...");
    
    // Drop the entire parkingspots collection (removes data AND indexes)
    try {
      await ParkingSpots.collection.drop();
      console.log("✅ Dropped parkingspots collection and indexes");
    } catch (error) {
      if (error.code === 26) { // Collection doesn't exist
        console.log("ℹ️  parkingspots collection doesn't exist yet");
      } else {
        throw error;
      }
    }
    
    // Clear parking lots (this keeps the collection, just removes documents)
    await ParkingLot.deleteMany({});
    console.log("✅ Cleared parking lots");
    
    console.log("\n✅ Parking data cleared and ready for new seed");
    console.log("ℹ️  Run 'npm run seed' to create new data");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

resetDatabase();
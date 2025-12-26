import mongoose from "mongoose";
import dotenv from "dotenv";
import ParkingLot from "./models/ParkingLot.js";

dotenv.config();

// Dhaka coordinates for sample parking lots
const dhakaParkingLots = [
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
  {
    name: "Aarong",
    address: "Aarong, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7465,
    longitude: 90.3760,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "09:00", close: "21:00" }
  },
  {
    name: "Jamuna Future Park",
    address: "Progoti Shoroni, Dhaka",
    location: "Bashundhara",
    latitude: 23.8155,
    longitude: 90.4256,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "roofed"],
    openingHours: { open: "10:00", close: "22:00" }
  },
  {
    name: "Gulshan 1 Community Center",
    address: "Gulshan 1, Dhaka",
    location: "Gulshan",
    latitude: 23.7947,
    longitude: 90.4143,
    type: "free",
    amenities: ["security", "lighting"],
    openingHours: { open: "06:00", close: "20:00" }
  },
  {
    name: "Banani DOHS Parking",
    address: "DOHS, Banani, Dhaka",
    location: "Banani",
    latitude: 23.7939,
    longitude: 90.4074,
    type: "paid",
    amenities: ["security", "cctv"],
    openingHours: { open: "24/7", close: "24/7" }
  },
  {
    name: "Dhanmondi Lake Park",
    address: "Dhanmondi Lake, Road 32, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7439,
    longitude: 90.3726,
    type: "free",
    amenities: ["lighting"],
    openingHours: { open: "06:00", close: "20:00" }
  },
  {
    name: "Mirpur Stadium Parking",
    address: "Mirpur Stadium, Dhaka",
    location: "Mirpur",
    latitude: 23.8067,
    longitude: 90.3687,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "22:00" }
  }
];

const seedParkingLots = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing parking lots
    await ParkingLot.deleteMany({});
    console.log("🗑️  Cleared existing parking lots");

    // Insert sample parking lots
    await ParkingLot.insertMany(dhakaParkingLots);
    
    console.log("✅ Added 7 sample parking lots in Dhaka:");
    dhakaParkingLots.forEach((lot, index) => {
      console.log(`   ${index + 1}. ${lot.name} (${lot.location}) - ${lot.type}`);
    });

    console.log("\n🎯 Parking lots are ready for the live map!");
    console.log("📍 All locations are in Dhaka, Bangladesh");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

seedParkingLots();

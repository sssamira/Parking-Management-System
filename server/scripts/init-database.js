// server/scripts/init-database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ParkingLot from '../models/ParkingLot.js';
import ParkingSpots from '../models/ParkingSpots.js';

dotenv.config();

// 32 Parking Lots - NO totalSpots or availableSpots
const allParkingLots = [
  // Shopping Malls (9)
  {
    name: "Bashundhara City",
    address: "Bashundhara City Shopping Complex, Panthapath, Dhaka",
    location: "Panthapath",
    latitude: 23.7551,
    longitude: 90.3839,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "roofed", "valet"],
    openingHours: { open: "10:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Jamuna Future Park",
    address: "Progoti Shoroni, Dhaka",
    location: "Bashundhara",
    latitude: 23.8155,
    longitude: 90.4256,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "roofed"],
    openingHours: { open: "10:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Shimanto Shambhar",
    address: "Shimanto Shambhar, Dhaka",
    location: "Gulshan",
    latitude: 23.7950,
    longitude: 90.4130,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "roofed"],
    openingHours: { open: "08:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Eastern Plaza",
    address: "Eastern Plaza, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7450,
    longitude: 90.3750,
    type: "paid",
    amenities: ["security", "cctv"],
    openingHours: { open: "08:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "New Market",
    address: "New Market, Dhaka",
    location: "New Market",
    latitude: 23.7300,
    longitude: 90.3960,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "09:00", close: "21:00" },
    isOpen: true
  },
  {
    name: "City Centre",
    address: "City Centre, Dhaka",
    location: "Panthapath",
    latitude: 23.7540,
    longitude: 90.3840,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Aarong",
    address: "Aarong, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7465,
    longitude: 90.3760,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "09:00", close: "21:00" },
    isOpen: true
  },
  {
    name: "Gulshan 1 Shopping Complex",
    address: "Gulshan 1, Dhaka",
    location: "Gulshan",
    latitude: 23.7940,
    longitude: 90.4140,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "10:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Gulshan 2 Shopping Complex",
    address: "Gulshan 2, Dhaka",
    location: "Gulshan",
    latitude: 23.7960,
    longitude: 90.4150,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "valet"],
    openingHours: { open: "10:00", close: "22:00" },
    isOpen: true
  },

  // Hospitals (8)
  {
    name: "Apollo Hospital",
    address: "Apollo Hospital, Dhaka",
    location: "Bashundhara",
    latitude: 23.8160,
    longitude: 90.4240,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "valet"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "Square Hospital",
    address: "Square Hospital, Dhaka",
    location: "Panthapath",
    latitude: 23.7530,
    longitude: 90.3850,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "United Hospital",
    address: "United Hospital, Dhaka",
    location: "Gulshan",
    latitude: 23.7930,
    longitude: 90.4160,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "valet"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "Ibn Sina Hospital",
    address: "Ibn Sina Hospital, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7440,
    longitude: 90.3770,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Labaid Hospital",
    address: "Labaid Hospital, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7435,
    longitude: 90.3780,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "valet"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "Popular Hospital",
    address: "Popular Hospital, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7420,
    longitude: 90.3790,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Dhaka Medical College Hospital",
    address: "Dhaka Medical College Hospital, Dhaka",
    location: "Puran Dhaka",
    latitude: 23.7230,
    longitude: 90.3990,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "Bangabandhu Sheikh Mujib Medical University",
    address: "BSMMU, Shahbag, Dhaka",
    location: "Shahbag",
    latitude: 23.7360,
    longitude: 90.3960,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },

  // Educational Institutions (7)
  {
    name: "University of Dhaka",
    address: "University of Dhaka, Dhaka",
    location: "Shahbag",
    latitude: 23.7338,
    longitude: 90.3927,
    type: "free",
    amenities: ["security", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "North South University",
    address: "North South University, Bashundhara, Dhaka",
    location: "Bashundhara",
    latitude: 23.8170,
    longitude: 90.4260,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "BRAC University",
    address: "BRAC University, Mohakhali, Dhaka",
    location: "Mohakhali",
    latitude: 23.7770,
    longitude: 90.4060,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "Independent University Bangladesh",
    address: "IUB, Bashundhara, Dhaka",
    location: "Bashundhara",
    latitude: 23.8180,
    longitude: 90.4270,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "American International University",
    address: "AIUB, Kuratoli, Dhaka",
    location: "Kuratoli",
    latitude: 23.8220,
    longitude: 90.4300,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "East West University",
    address: "East West University, Aftabnagar, Dhaka",
    location: "Aftabnagar",
    latitude: 23.8300,
    longitude: 90.4380,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },
  {
    name: "Daffodil International University",
    address: "DIU, Dhanmondi, Dhaka",
    location: "Dhanmondi",
    latitude: 23.7410,
    longitude: 90.3740,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "08:00", close: "20:00" },
    isOpen: true
  },

  // Airports & Transport (4)
  {
    name: "Hazrat Shahjalal International Airport",
    address: "Hazrat Shahjalal International Airport, Dhaka",
    location: "Kurmitola",
    latitude: 23.8433,
    longitude: 90.3978,
    type: "paid",
    amenities: ["security", "cctv", "lighting", "valet"],
    openingHours: { open: "00:00", close: "23:59" },
    isOpen: true
  },
  {
    name: "Kamalapur Railway Station",
    address: "Kamalapur Railway Station, Dhaka",
    location: "Kamalapur",
    latitude: 23.7270,
    longitude: 90.4190,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "06:00", close: "23:00" },
    isOpen: true
  },
  {
    name: "Gabtoli Bus Terminal",
    address: "Gabtoli Bus Terminal, Dhaka",
    location: "Gabtoli",
    latitude: 23.7970,
    longitude: 90.3580,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "06:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Sayedabad Bus Terminal",
    address: "Sayedabad Bus Terminal, Dhaka",
    location: "Sayedabad",
    latitude: 23.7220,
    longitude: 90.4450,
    type: "paid",
    amenities: ["security", "cctv", "lighting"],
    openingHours: { open: "06:00", close: "22:00" },
    isOpen: true
  },

  // Entertainment & Recreation (4)
  {
    name: "National Museum",
    address: "National Museum, Shahbag, Dhaka",
    location: "Shahbag",
    latitude: 23.7390,
    longitude: 90.3950,
    type: "free",
    amenities: ["security", "lighting"],
    openingHours: { open: "10:00", close: "18:00" },
    isOpen: true
  },
  {
    name: "Bangladesh National Zoo",
    address: "Bangladesh National Zoo, Mirpur, Dhaka",
    location: "Mirpur",
    latitude: 23.8130,
    longitude: 90.3530,
    type: "free",
    amenities: ["security", "lighting"],
    openingHours: { open: "09:00", close: "17:00" },
    isOpen: true
  },
  {
    name: "Hatirjheel",
    address: "Hatirjheel, Dhaka",
    location: "Hatirjheel",
    latitude: 23.7640,
    longitude: 90.4100,
    type: "free",
    amenities: ["lighting"],
    openingHours: { open: "06:00", close: "22:00" },
    isOpen: true
  },
  {
    name: "Gulshan Lake Park",
    address: "Gulshan Lake Park, Dhaka",
    location: "Gulshan",
    latitude: 23.7920,
    longitude: 90.4170,
    type: "free",
    amenities: ["lighting"],
    openingHours: { open: "06:00", close: "20:00" },
    isOpen: true
  }
];

const initDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing parking lots and spots
    await ParkingLot.deleteMany({});
    await ParkingSpots.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert all 32 parking lots
    const createdLots = await ParkingLot.insertMany(allParkingLots);
    console.log(`✅ Created ${createdLots.length} parking lots`);

    // Create VARIABLE number of spots per lot (more realistic)
    // Some lots have more spots, some have fewer
    const spotsToCreate = [
        // Shopping Malls
        { lotName: "Bashundhara City", spots: 15 },
        { lotName: "Jamuna Future Park", spots: 15 },
        { lotName: "Shimanto Shambhar", spots: 12 },
        { lotName: "Eastern Plaza", spots: 8 },
        { lotName: "New Market", spots: 10 },
        { lotName: "City Centre", spots: 8 },
        { lotName: "Aarong", spots: 8 },
        { lotName: "Gulshan 1 Shopping Complex", spots: 8 },
        { lotName: "Gulshan 2 Shopping Complex", spots: 8 },
        
        // Hospitals
        { lotName: "Apollo Hospital", spots: 10 },
        { lotName: "Square Hospital", spots: 10 },
        { lotName: "United Hospital", spots: 10 },
        { lotName: "Ibn Sina Hospital", spots: 8 },
        { lotName: "Labaid Hospital", spots: 8 },
        { lotName: "Popular Hospital", spots: 8 },
        { lotName: "Dhaka Medical College Hospital", spots: 12 },
        { lotName: "Bangabandhu Sheikh Mujib Medical University", spots: 10 },
        
        // Educational Institutions
        { lotName: "University of Dhaka", spots: 8 },
        { lotName: "North South University", spots: 8 },
        { lotName: "BRAC University", spots: 8 },
        { lotName: "Independent University Bangladesh", spots: 8 },
        { lotName: "American International University", spots: 8 },
        { lotName: "East West University", spots: 8 },
        { lotName: "Daffodil International University", spots: 8 },
        
        // Airports & Transport
        { lotName: "Hazrat Shahjalal International Airport", spots: 20 },
        { lotName: "Kamalapur Railway Station", spots: 12 },
        { lotName: "Gabtoli Bus Terminal", spots: 15 },
        { lotName: "Sayedabad Bus Terminal", spots: 15 },
        
        // Entertainment & Recreation
        { lotName: "National Museum", spots: 8 },
        { lotName: "Bangladesh National Zoo", spots: 10 },
        { lotName: "Hatirjheel", spots: 6 },
        { lotName: "Gulshan Lake Park", spots: 6 }
      ];

    const allSpots = [];

    for (const lot of createdLots) {
      // Find config for this lot, or default to 4 spots
      const config = spotsToCreate.find(c => c.lotName === lot.name);
      const spotCount = config ? config.spots : 4;
      
      // Create spots with correct schema
      for (let i = 1; i <= spotCount; i++) {
        allSpots.push({
          spotNum: `A${i}`, // Simple: A1, A2, A3, etc.
          parkingLotName: lot.name, // Uppercase L
          floor: 0, // Ground floor
          location: lot.location,
          area: lot.location,
          vehicleType: 'Car',
          pricePerHour: lot.type === 'paid' ? (lot.location.includes("Airport") ? 100 : 50) : 0,
          tags: []
        });
      }
    }

    await ParkingSpots.insertMany(allSpots);
    console.log(`✅ Created ${allSpots.length} parking spots (varied per lot)`);

    // Show summary
    console.log("\n📊 Summary:");
    console.log(`📍 Total Parking Lots: ${createdLots.length}`);
    console.log(`🅿️  Total Parking Spots: ${allSpots.length}`);
    console.log(`💰 Paid Parking Lots: ${createdLots.filter(l => l.type === 'paid').length}`);
    console.log(`🆓 Free Parking Lots: ${createdLots.filter(l => l.type === 'free').length}`);
    
    console.log("\n🎯 DEMO READY!");
    console.log("👨‍💼 Admin can now add more spots via dashboard");
    console.log("👤 Users can book available spots");
    console.log("🗺️  Map shows 32 locations across Dhaka");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

initDatabase();
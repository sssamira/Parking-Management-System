import express from "express";
import { protect, admin } from "../middleware/auth.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// @route   POST /api/admin/vehicle-lookup
// @desc    Admin lookup vehicle details
// @access  Private/Admin
router.post("/vehicle-lookup", protect, admin, async (req, res) => {
  try {
    const { searchType, searchValue } = req.body;

    console.log("🔍 Vehicle lookup request:", { searchType, searchValue });

    if (!searchType || !searchValue) {
      return res.status(400).json({
        success: false,
        message: "Please provide search type and value"
      });
    }

    let results = [];

    // Search by license plate
    if (searchType === "licensePlate") {
      // Search in User vehicles
      const users = await User.find({
        "vehicles.licensePlate": { $regex: searchValue, $options: "i" }
      }).select("name email phone vehicles");

      for (const user of users) {
        const matchingVehicles = user.vehicles.filter(
          v => v.licensePlate.toLowerCase().includes(searchValue.toLowerCase())
        );
        
        for (const vehicle of matchingVehicles) {
          const bookings = await Booking.find({
            licensePlate: vehicle.licensePlate
          }).select("startTime endTime parkingLotName status");

          results.push({
            type: "registered_user",
            user: {
              name: user.name,
              email: user.email,
              phone: user.phone
            },
            vehicle: {
              licensePlate: vehicle.licensePlate,
              carType: vehicle.carType,
              carModel: vehicle.carModel,
              carColor: vehicle.carColor
            },
            bookings
          });
        }
      }

      // Search for guest bookings
      const guestBookings = await Booking.find({
        licensePlate: { $regex: searchValue, $options: "i" },
        userId: { $exists: false }
      }).select("startTime endTime parkingLotName status customerName");

      if (guestBookings.length > 0) {
        results.push({
          type: "guest_booking",
          bookings: guestBookings
        });
      }
    }

    // Search by email
    else if (searchType === "email") {
      const user = await User.findOne({
        email: { $regex: searchValue, $options: "i" }
      }).select("name email phone vehicles");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No user found with this email"
        });
      }

      const bookings = await Booking.find({ userId: user._id });

      results.push({
        type: "registered_user",
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        vehicles: user.vehicles,
        bookings
      });
    }

    // Search by phone
    else if (searchType === "phone") {
      const user = await User.findOne({
        phone: { $regex: searchValue, $options: "i" }
      }).select("name email phone vehicles");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No user found with this phone number"
        });
      }

      const bookings = await Booking.find({ userId: user._id });

      results.push({
        type: "registered_user",
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        vehicles: user.vehicles,
        bookings
      });
    }

    // Search by booking ID
    else if (searchType === "bookingId") {
      const booking = await Booking.findById(searchValue)
        .populate("userId", "name email phone");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      results.push({
        type: "booking",
        booking,
        user: booking.userId
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found"
      });
    }

    res.json({
      success: true,
      message: "Vehicle details retrieved",
      data: results
    });
  } catch (error) {
    console.error("Vehicle lookup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
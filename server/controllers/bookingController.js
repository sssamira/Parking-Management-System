import Booking from '../models/Booking.js';
import ParkingSpot from '../models/ParkingSpots.js';
import nodemailer from 'nodemailer';

// Build a mail transporter if SMTP env vars are set
const transporter = (() => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('📭 SMTP not fully configured. Booking emails will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
})();

const sendBookingEmail = async ({ to, subject, html }) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || `"Parking Management" <no-reply@parking.example>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('❌ Failed to send booking email:', err.message);
  }
};

// Helper: check overlap
const hasOverlap = async ({ spotId, startTime, endTime }) => {
  const conflict = await Booking.exists({
    parkingSpot: spotId,
    status: 'booked',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  return Boolean(conflict);
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

    const booking = await Booking.create({
      parkingSpot: spot._id,
      user: userId,
      vehicle: {
        licensePlate: vehicle?.licensePlate,
        carType: vehicle?.carType,
      },
      startTime: start,
      endTime: end,
      price,
    });

    // Fire-and-forget email
    sendBookingEmail({
      to: req.user.email,
      subject: 'Your parking spot is booked',
      html: `
        <h2>Booking Confirmed</h2>
        <p>Hi ${req.user.name || ''},</p>
        <p>Your parking spot reservation is confirmed.</p>
        <ul>
          <li><strong>Spot:</strong> ${spot.parkinglotName} - ${spot.spotNum}</li>
          <li><strong>Location:</strong> ${spot.location}</li>
          <li><strong>From:</strong> ${start.toLocaleString()}</li>
          <li><strong>To:</strong> ${end.toLocaleString()}</li>
          <li><strong>Price:</strong> $${price}</li>
        </ul>
        <p>Thank you for choosing our service.</p>
      `,
    });

    return res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ message: 'Server error while creating booking' });
  }
};


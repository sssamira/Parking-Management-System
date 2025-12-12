import Fine from '../models/Fine.js';
import Booking from '../models/Booking.js';

class FineCalculator {
  constructor(hourlyRate = 10) {
    this.hourlyRate = hourlyRate;
  }

  // Check for overtime vehicles and issue fines
  async checkOvertimeVehicles() {
    try {
      const now = new Date();
      
      // Find bookings where:
      // 1. paidUntil has passed
      // 2. fineIssued is false (haven't been fined yet)
      // 3. status is 'booked' or 'completed' (vehicle is/was parked)
      const overtimeBookings = await Booking.find({
        paidUntil: { $lt: now },
        fineIssued: false,
        status: { $in: ['booked', 'completed'] }
      }).populate('user');

      const fines = [];

      for (const booking of overtimeBookings) {
        // Calculate overtime hours (round up to nearest hour)
        const overtimeHours = this.calculateOvertime(booking.paidUntil, now);
        const fineAmount = overtimeHours * this.hourlyRate;

        // Create fine record
        const fine = new Fine({
          bookingId: booking._id,
          userId: booking.user._id,
          licensePlate: booking.vehicle?.licensePlate || booking.licenseNumber || 'Unknown',
          checkInTime: booking.startTime || booking.createdAt,
          paidUntil: booking.paidUntil || booking.endTime,
          actualExitTime: now,
          overtimeHours,
          hourlyRate: this.hourlyRate,
          fineAmount,
          status: 'issued'
        });

        await fine.save();
        
        // Update booking to mark fine as issued
        booking.fineIssued = true;
        booking.fineId = fine._id;
        await booking.save();

        fines.push(fine);
      }

      return fines;
    } catch (error) {
      console.error('Error checking overtime vehicles:', error);
      throw error;
    }
  }

  calculateOvertime(paidUntil, currentTime) {
    const overtimeMs = currentTime - new Date(paidUntil);
    const overtimeHours = Math.ceil(overtimeMs / (1000 * 60 * 60)); // Round up to nearest hour
    return Math.max(1, overtimeHours); // Minimum 1 hour
  }

  // Calculate fine for specific booking
  calculateFineForBooking(booking) {
    const now = new Date();
    const overtimeHours = this.calculateOvertime(booking.paidUntil, now);
    return {
      overtimeHours,
      fineAmount: overtimeHours * this.hourlyRate,
      hourlyRate: this.hourlyRate
    };
  }
}

export default FineCalculator;
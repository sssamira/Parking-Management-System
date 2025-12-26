import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import sendEmail from '../utils/sendEmail.js';

const LEAD_MINUTES = Number(process.env.BOOKING_REMINDER_LEAD_MINUTES || 10);
const POLL_INTERVAL_MS = Number(process.env.BOOKING_REMINDER_POLL_MS || 60000);
const WINDOW_MS = Number(process.env.BOOKING_REMINDER_WINDOW_MS || 60000);
const LOG_PREFIX = '[booking-reminder]';

let reminderTimer = null;
let isRunning = false;

const formatDateTime = (date) =>
	new Date(date).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

const buildParkingLabel = (booking) => {
	const fromSpot = booking.parkingSpot?.parkingLotName
		|| booking.parkingSpot?.parkinglotName
		|| booking.parkingLotName
		|| booking.location
		|| 'Parking Spot';

	const spotNum = booking.parkingSpot?.spotNum;
	return spotNum ? `${fromSpot} • Spot ${spotNum}` : fromSpot;
};

const shouldProcess = () => {
	if (isRunning) {
		return false;
	}

	if (mongoose.connection.readyState !== 1) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`${LOG_PREFIX} Skipping run; MongoDB not connected yet.`);
		}
		return false;
	}

	return true;
};

const sendReminderForBooking = async (booking) => {
	if (!booking?.user?.email) {
		console.warn(`${LOG_PREFIX} Booking ${booking._id} skipped: user email missing.`);
		return { success: false, error: 'User email missing' };
	}

	const parkingLabel = buildParkingLabel(booking);
	const endTimeLabel = formatDateTime(booking.endTime);

	const subject = `Reminder: Your parking spot ends at ${endTimeLabel}`;
	const html = `
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2 style="color: #4F46E5;">Parking Slot Reminder</h2>
			<p>Hello ${booking.user.name || 'there'},</p>
			<p>This is a friendly reminder that your approved parking slot is scheduled to end in about ${LEAD_MINUTES} minutes.</p>
			<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
				<p><strong>Parking:</strong> ${parkingLabel}</p>
				<p><strong>Start Time:</strong> ${booking.startTime ? formatDateTime(booking.startTime) : 'Not available'}</p>
				<p><strong>End Time:</strong> ${endTimeLabel}</p>
				<p><strong>Status:</strong> ${booking.status}</p>
			</div>
			<p>Please wrap up your session or extend it before the slot expires to avoid penalties.</p>
			<p style="color: #6b7280; font-size: 12px; margin-top: 24px;">This is an automated reminder email.</p>
		</div>
	`;
	const text = `Reminder: Your parking slot (${parkingLabel}) ends at ${endTimeLabel}. Please wrap up or extend before it expires.`;

	const emailResult = await sendEmail({
		to: booking.user.email,
		subject,
		html,
		text,
	});

	const update = emailResult.success
		? {
				reminderEmailSent: true,
				reminderEmailSentAt: new Date(),
				reminderEmailError: null,
			}
		: {
				reminderEmailSent: false,
				reminderEmailError: emailResult.error || 'Unknown error',
			};

	await Booking.updateOne({ _id: booking._id }, { $set: update });

	if (emailResult.success) {
		console.log(`${LOG_PREFIX} Reminder sent for booking ${booking._id} (${booking.user.email}).`);
	} else {
		console.error(`${LOG_PREFIX} Failed to send reminder for booking ${booking._id}: ${emailResult.error}`);
	}
};

const processBookings = async () => {
	if (!shouldProcess()) {
		return;
	}

	isRunning = true;

	try {
		const now = new Date();
		const leadMs = LEAD_MINUTES * 60 * 1000;
		const targetStart = new Date(now.getTime() + leadMs - WINDOW_MS);
		const targetEnd = new Date(now.getTime() + leadMs + WINDOW_MS);

		const bookings = await Booking.find({
			status: { $in: ['approved', 'booked'] },
			endTime: { $ne: null, $gte: targetStart, $lte: targetEnd },
			reminderEmailSent: { $ne: true },
		})
			.populate('user', 'name email')
			.populate('parkingSpot', 'parkingLotName parkinglotName spotNum location floor')
			.lean();

		if (bookings.length && process.env.NODE_ENV === 'development') {
			console.log(`${LOG_PREFIX} Found ${bookings.length} booking(s) nearing end time.`);
		}

		for (const booking of bookings) {
			await sendReminderForBooking(booking);
		}
	} catch (error) {
		console.error(`${LOG_PREFIX} Error while processing reminders:`, error);
	} finally {
		isRunning = false;
	}
};

export const startBookingReminderJob = () => {
	if (reminderTimer) {
		return reminderTimer;
	}

	console.log(`${LOG_PREFIX} Initializing job (lead ${LEAD_MINUTES}m, interval ${POLL_INTERVAL_MS / 1000}s).`);
	reminderTimer = setInterval(processBookings, POLL_INTERVAL_MS);

	// Kick off immediately to avoid waiting for first interval
	processBookings().catch((error) => {
		console.error(`${LOG_PREFIX} Initial run failed:`, error.message);
	});

	return reminderTimer;
};

export const stopBookingReminderJob = () => {
	if (reminderTimer) {
		clearInterval(reminderTimer);
		reminderTimer = null;
	}
};

export default startBookingReminderJob;

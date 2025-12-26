import EventEmitter from 'events';

class ParkingEventEmitter extends EventEmitter {}

const parkingEvents = new ParkingEventEmitter();

// Log all events for debugging
parkingEvents.on('bookingCreated', (data) => {
  console.log('📅 Booking Created Event:', data.parkingLotName);
});

parkingEvents.on('bookingApproved', (data) => {
  console.log('✅ Booking Approved Event:', data.parkingLotName);
});

parkingEvents.on('bookingRejected', (data) => {
  console.log('❌ Booking Rejected Event:', data.parkingLotName);
});

parkingEvents.on('bookingActive', (data) => {
  console.log('🚗 Booking Active Event:', data.parkingLotName);
});

parkingEvents.on('bookingCompleted', (data) => {
  console.log('🏁 Booking Completed Event:', data.parkingLotName);
});

parkingEvents.on('spotAdded', (data) => {
  console.log('➕ Spot Added Event:', data.parkingLotName);
});

parkingEvents.on('spotRemoved', (data) => {
  console.log('➖ Spot Removed Event:', data.parkingLotName);
});

export default parkingEvents;
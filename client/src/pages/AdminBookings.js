import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    checkAdminAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
      await fetchPendingBookings();
    } catch (err) {
      console.error('Error checking admin:', err);
      navigate('/');
    }
  };

  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/admin/pending');
      const bookingsData = response.data?.bookings || [];
      console.log('📋 Fetched bookings:', bookingsData);
      console.log('📋 Booking count:', bookingsData.length);
      bookingsData.forEach((booking, index) => {
        console.log(`Booking ${index + 1}:`, {
          id: booking._id,
          userId: booking.user?._id || booking.user,
          userName: booking.user?.name,
          userEmail: booking.user?.email,
          userPhone: booking.user?.phone,
          status: booking.status
        });
      });
      setBookings(bookingsData);
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
      window.alert('Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId) => {
    try {
      setProcessing(bookingId);
      const response = await api.patch(`/bookings/${bookingId}/approve`);
      
      // Immediately remove from local state for instant UI update
      setBookings(prevBookings => prevBookings.filter(booking => booking._id !== bookingId));
      
      // Show success message (email is optional)
      if (response.data?.emailSent) {
        window.alert('Booking approved successfully! Confirmation email has been sent to the user.');
      } else {
        window.alert('Booking approved successfully!');
      }
      
      // Then refresh from server to ensure consistency
      await fetchPendingBookings();
    } catch (err) {
      console.error('Error approving booking:', err);
      const errorData = err.response?.data;
      const errorMessage = errorData?.message || 'Failed to approve booking';
      
      // Check if it's a "no spots available" error
      if (errorData?.code === 'NO_SPOTS_AT_PARKING_LOT' || errorData?.code === 'NO_AVAILABLE_SPOTS') {
        const parkingLotName = errorData?.parkingLotName || 'this parking lot';
        const addMore = window.confirm(
          `${errorMessage}\n\nWould you like to add more spots for "${parkingLotName}"?`
        );
        
        if (addMore) {
          // Redirect to add spots page with parking lot name pre-filled
          window.location.href = `/admin/spots?parkingLotName=${encodeURIComponent(parkingLotName)}`;
          return;
        }
      } else {
        window.alert(errorMessage);
      }
      
      // Refresh list even on error to ensure consistency
      await fetchPendingBookings();
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (bookingId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      setProcessing(bookingId);
      const response = await api.patch(`/bookings/${bookingId}/reject`, { reason });
      
      // Immediately remove from local state for instant UI update
      setBookings(prevBookings => prevBookings.filter(booking => booking._id !== bookingId));
      
      // Show success message (email is optional)
      if (response.data?.emailSent) {
        window.alert('Booking rejected successfully! Rejection email has been sent to the user.');
      } else {
        window.alert('Booking rejected successfully!');
      }
      
      // Then refresh from server to ensure consistency
      await fetchPendingBookings();
    } catch (err) {
      console.error('Error rejecting booking:', err);
      window.alert(err.response?.data?.message || 'Failed to reject booking');
      // Refresh list even on error to ensure consistency
      await fetchPendingBookings();
    } finally {
      setProcessing(null);
    }
  };

  const handleRecordEntry = async (bookingId) => {
    try {
      setTracking(bookingId);
      await api.post(`/bookings/${bookingId}/entry`);
      window.alert('Entry time recorded successfully!');
      await fetchPendingBookings();
    } catch (err) {
      console.error('Error recording entry:', err);
      window.alert(err.response?.data?.message || 'Failed to record entry time');
    } finally {
      setTracking(null);
    }
  };

  const handleRecordExit = async (bookingId) => {
    try {
      setTracking(bookingId);
      const response = await api.post(`/bookings/${bookingId}/exit`);
      const data = response.data;
      
      // Build detailed success message
      let message = '✅ Exit time recorded successfully!\n\n';
      message += '📊 Payment Details:\n';
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      const calculatedPrice = data.booking?.actualPrice || 0;
      const chargedAmount = data.booking?.chargedAmount || calculatedPrice;
      const minimumApplied = data.booking?.minimumChargeApplied || false;
      
      // Always show charged amount, with note if minimum was applied
      if (minimumApplied && chargedAmount > calculatedPrice) {
        message += `Charged Amount: ৳${chargedAmount.toFixed(2)} (minimum charge applied)\n`;
      } else {
        message += `Charged Amount: ৳${chargedAmount.toFixed(2)}\n`;
      }
      
      const paymentStatus = data.booking?.paymentStatus || 'pending';
      if (paymentStatus === 'paid') {
        message += `Payment Status: ✅ PAID (Auto-charged)\n`;
        if (data.booking?.paymentIntentId) {
          message += `Payment ID: ${data.booking.paymentIntentId}\n`;
        }
        if (minimumApplied) {
          message += `\n💳 Payment automatically charged from saved card.\n`;
          message += `ℹ️ Minimum charge (৳65) applied as calculated amount was below Stripe minimum.`;
        } else {
          message += `\n💳 Payment automatically charged from saved card.`;
        }
      } else if (paymentStatus === 'failed') {
        message += `Payment Status: ❌ FAILED\n`;
        if (data.paymentError) {
          message += `Error: ${data.paymentError}\n`;
        }
      } else {
        message += `Payment Status: ⏳ PENDING\n`;
        if (data.paymentError) {
          message += `Reason: ${data.paymentError}\n`;
        } else {
          message += `(No payment method saved - manual payment required)\n`;
        }
      }
      
      window.alert(message);
      await fetchPendingBookings();
    } catch (err) {
      console.error('Error recording exit:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to record exit time';
      window.alert(`❌ Error: ${errorMessage}`);
    } finally {
      setTracking(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading pending bookings...</p>
        </div>
      </div>
    );
  }

  const locationIcon = (
    <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const calendarIcon = (
    <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  const carIcon = (
    <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h8M5 7v10a1 1 0 001 1h12a1 1 0 001-1V7" />
    </svg>
  );
  const bikeIcon = carIcon;
  const chatIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe] text-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-block text-purple-700 hover:text-purple-900 font-medium mb-8"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-center mb-10 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          Pending Requests
        </h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-xl text-gray-600">No pending requests</p>
            <p className="text-gray-500 mt-2">All requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking, index) => {
              const isSearchQuery = booking.status === 'search_query';
              const userObj = typeof booking.user === 'object' ? booking.user : null;
              const userId = userObj?._id || booking.user || 'Unknown';
              const userName = userObj?.name || 'N/A';
              const initial = (userName.charAt(0) || '?').toUpperCase();
              const locationName = isSearchQuery
                ? (booking.parkingLotName || booking.location || 'Not specified')
                : (booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || booking.parkingLotName || booking.location || 'Not assigned');
              const spotInfo = booking.parkingSpot?.spotNum ? `Spot: ${booking.parkingSpot.spotNum}` : '';
              const areaInfo = booking.parkingSpot?.location ? `Area: ${booking.parkingSpot.location}` : '';
              const vehicleType = booking.vehicle?.carType || booking.vehicleType || 'Not specified';
              const isBike = /bike|bike/i.test(vehicleType);
              const hasTime = booking.startTime && booking.endTime;
              const timeFrom = hasTime ? new Date(booking.startTime).toLocaleString() : null;
              const timeTo = hasTime ? new Date(booking.endTime).toLocaleString() : null;
              const license = booking.vehicle?.licensePlate || booking.licenseNumber || 'Not specified';
              const model = booking.carModel || '';
              const driver = booking.driverName || '';

              return (
                <div
                  key={`${booking._id}-${index}`}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6 flex flex-col lg:flex-row lg:items-stretch gap-6">
                    {/* User */}
                    <div className="flex items-start gap-4 flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate max-w-[140px]">{userName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[160px]">{userObj?.email || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{userObj?.phone || 'N/A'}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{String(userId).substring(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="flex gap-2">
                        {locationIcon}
                        <div>
                          <p className="font-medium text-gray-900">{locationName}</p>
                          {(spotInfo || areaInfo) && (
                            <p className="text-sm text-gray-600">{[spotInfo, areaInfo].filter(Boolean).join(', ')}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                            {isBike ? bikeIcon : carIcon}
                            <span>{vehicleType}</span>
                          </div>
                          {isSearchQuery && (
                            <p className="text-xs text-gray-400 mt-1">Search request for this parking lot</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex gap-2 flex-shrink-0">
                      {calendarIcon}
                      <div className="text-sm text-gray-700">
                        {hasTime ? (
                          <>
                            <p className="font-medium text-gray-500">FROM</p>
                            <p>{timeFrom}</p>
                            <p className="font-medium text-gray-500 mt-1">TO</p>
                            <p>{timeTo}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Not specified</p>
                        )}
                      </div>
                    </div>

                    {/* Vehicle details */}
                    <div className="flex gap-2 flex-shrink-0">
                      {isBike ? bikeIcon : carIcon}
                      <div className="text-sm text-gray-700">
                        <p><span className="text-gray-500">License</span> {license}</p>
                        {model ? <p><span className="text-gray-500">Model</span> {model}</p> : null}
                        {driver ? <p><span className="text-gray-500">Driver</span> {driver}</p> : null}
                        {(!license || license === 'Not specified') && !model && !driver ? <p className="text-gray-500">Not specified</p> : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                      {(booking.status === 'pending' || booking.status === 'search_query') && (
                        <span className="text-xs text-gray-500">
                          {isSearchQuery ? 'Search Query' : 'Search Request'}
                        </span>
                      )}
                      {(booking.status === 'approved' || booking.status === 'booked') && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending Booking
                        </span>
                      )}
                      {userId && String(userId) !== 'Unknown' && (
                        <Link
                          to={`/admin/chat?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(userObj?.name || 'User')}&email=${encodeURIComponent(userObj?.email || '')}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition shadow-sm"
                        >
                          {chatIcon}
                          Chat
                        </Link>
                      )}
                      {(booking.status === 'pending' || booking.status === 'search_query') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(booking._id)}
                            disabled={processing === booking._id}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                          >
                            {processing === booking._id ? 'Processing...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleReject(booking._id)}
                            disabled={processing === booking._id}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                          >
                            {processing === booking._id ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {(booking.status === 'approved' || booking.status === 'booked') && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {!booking.actualEntryTime ? (
                            <button
                              onClick={() => handleRecordEntry(booking._id)}
                              disabled={tracking === booking._id}
                              className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                            >
                              {tracking === booking._id ? 'Recording...' : 'Record Entry'}
                            </button>
                          ) : (
                            <span className="text-xs text-green-600 font-semibold">
                              ✓ Entered: {new Date(booking.actualEntryTime).toLocaleTimeString()}
                            </span>
                          )}
                          {booking.actualEntryTime && !booking.actualExitTime && (
                            <button
                              onClick={() => handleRecordExit(booking._id)}
                              disabled={tracking === booking._id}
                              className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                            >
                              {tracking === booking._id ? 'Processing...' : 'Record Exit'}
                            </button>
                          )}
                          {booking.actualExitTime && (
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p>Exited: {new Date(booking.actualExitTime).toLocaleTimeString()}</p>
                              {booking.actualPrice > 0 && <p className="font-semibold text-purple-600">Fee: ৳{booking.actualPrice.toFixed(2)}</p>}
                              {booking.paymentStatus && (
                                <span className={`inline-block px-2 py-0.5 rounded ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : booking.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {booking.paymentStatus === 'paid' ? '✓ Paid' : booking.paymentStatus === 'failed' ? '✗ Failed' : 'Pending'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;


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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-0 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-indigo-900">Pending Requests</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-xl text-gray-600">No pending requests</p>
            <p className="text-gray-500 mt-2">All requests have been processed.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Parking Lot Name/Spot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Time/Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Vehicle Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Additional Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking, index) => {
                    const isSearchQuery = booking.status === 'search_query';
                    const userObj = typeof booking.user === 'object' ? booking.user : null;
                    const userId = userObj?._id || booking.user || 'Unknown';
                    
                    // Debug log for first few bookings
                    if (index < 3) {
                      console.log(`Booking ${index + 1} details:`, {
                        bookingId: booking._id,
                        userId: userId,
                        userObj: userObj,
                        userName: userObj?.name,
                        userEmail: userObj?.email,
                        status: booking.status
                      });
                    }
                    
                    return (
                      <tr key={`${booking._id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {userObj?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userObj?.email || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {userObj?.phone || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-300 mt-1 font-mono">
                            User: {String(userId).substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isSearchQuery ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Parking Lot Name: {booking.parkingLotName || booking.location || 'Not specified'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Vehicle Type: {booking.vehicleType || 'Not specified'}
                              </div>
                              {booking.parkingLotName || booking.location ? (
                                <div className="text-xs text-gray-400 mt-1">
                                  Search request for this parking lot
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {booking.parkingSpot?.parkingLotName || 
                                 booking.parkingSpot?.parkinglotName || 
                                 booking.parkingLotName || 
                                 booking.location || 
                                 'Not assigned'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Spot: {booking.parkingSpot?.spotNum || 'Not assigned'}
                              </div>
                              {booking.parkingSpot?.location && (
                                <div className="text-xs text-gray-400">
                                  Area: {booking.parkingSpot.location}
                                </div>
                              )}
                              {booking.parkingSpot?.floor && (
                                <div className="text-xs text-gray-400">
                                  Floor: {booking.parkingSpot.floor}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {booking.startTime && booking.endTime ? (
                            <div className="text-sm text-gray-900">
                              <div>From: {new Date(booking.startTime).toLocaleString()}</div>
                              <div>To: {new Date(booking.endTime).toLocaleString()}</div>
                            </div>
                          ) : booking.actualEntryTime && booking.actualExitTime ? (
                            <div className="text-sm text-gray-900">
                              <div>Entry: {new Date(booking.actualEntryTime).toLocaleString()}</div>
                              <div>Exit: {new Date(booking.actualExitTime).toLocaleString()}</div>
                            </div>
                          ) : booking.actualEntryTime ? (
                            <div className="text-sm text-gray-900">
                              <div>Entry: {new Date(booking.actualEntryTime).toLocaleString()}</div>
                              <div className="text-xs text-gray-400">Exit: Not recorded</div>
                            </div>
                          ) : booking.date ? (
                            <div className="text-sm text-gray-900">
                              Date: {new Date(booking.date).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Not specified</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            Type: {booking.vehicle?.carType || booking.vehicleType || 'Not specified'}
                          </div>
                          <div className="text-xs text-gray-500">
                            License: {booking.vehicle?.licensePlate || booking.licenseNumber || 'Not specified'}
                          </div>
                          {booking.carModel && (
                            <div className="text-xs text-gray-400">
                              Model: {booking.carModel}
                            </div>
                          )}
                          {booking.driverName && (
                            <div className="text-xs text-gray-400">
                              Driver: {booking.driverName}
                            </div>
                          )}
                          {!booking.carModel && !booking.driverName && !booking.vehicle?.carType && !booking.vehicleType && (
                            <div className="text-xs text-gray-400 italic">
                              No additional vehicle details
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isSearchQuery ? (
                            <div className="text-xs text-gray-500">
                              Search Request
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                ৳{booking.price || 0}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isSearchQuery 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isSearchQuery ? 'Search Query' : 'Pending Booking'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col space-y-2">
                            {/* Show Accept/Reject for pending bookings and search queries */}
                            {(booking.status === 'pending' || booking.status === 'search_query') && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApprove(booking._id)}
                                  disabled={processing === booking._id}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {processing === booking._id ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleReject(booking._id)}
                                  disabled={processing === booking._id}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {processing === booking._id ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            )}
                            {/* Entry/Exit Tracking for approved/booked bookings */}
                            {(booking.status === 'approved' || booking.status === 'booked') && (
                              <div className="flex space-x-2">
                                {!booking.actualEntryTime ? (
                                  <button
                                    onClick={() => handleRecordEntry(booking._id)}
                                    disabled={tracking === booking._id}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {tracking === booking._id ? 'Processing...' : 'Record Exit'}
                                  </button>
                                )}
                                {booking.actualExitTime && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-600">
                                      Exited: {new Date(booking.actualExitTime).toLocaleTimeString()}
                                    </span>
                                    {booking.actualPrice > 0 && (
                                      <span className="text-xs font-semibold text-indigo-600">
                                        Fee: ৳{booking.actualPrice.toFixed(2)}
                                      </span>
                                    )}
                                    {booking.paymentStatus && (
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        booking.paymentStatus === 'paid' 
                                          ? 'bg-green-100 text-green-800' 
                                          : booking.paymentStatus === 'failed'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {booking.paymentStatus === 'paid' ? '✓ Paid' : 
                                         booking.paymentStatus === 'failed' ? '✗ Failed' : 
                                         'Pending'}
                                      </span>
                                    )}
                                    {booking.paymentError && (
                                      <span className="text-xs text-red-600">
                                        {booking.paymentError}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;


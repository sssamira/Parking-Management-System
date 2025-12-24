import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      await fetchBookings();
    } catch (err) {
      console.error('Error checking auth:', err);
      navigate('/login');
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/bookings');
      const bookingsData = response.data?.bookings || [];
      setBookings(bookingsData);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to load bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      booked: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800',
    };
    return badges[paymentStatus] || 'bg-gray-100 text-gray-800';
  };

  const calculateDuration = (entryTime, exitTime) => {
    if (!entryTime || !exitTime) return 'N/A';
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const durationMs = exit.getTime() - entry.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your bookings...</p>
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
          <h1 className="text-3xl font-bold text-indigo-900">My Bookings</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl text-gray-600">No bookings found</p>
            <p className="text-gray-500 mt-2">You haven't made any parking bookings yet.</p>
            <Link
              to="/book-spot"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Book a Spot
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Parking Spot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Booking Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Entry/Exit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-900 uppercase tracking-wider">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Spot: {booking.parkingSpot?.spotNum || 'N/A'}
                        </div>
                        {booking.parkingSpot?.floor && (
                          <div className="text-xs text-gray-400">
                            Floor: {booking.parkingSpot.floor}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>From: {formatDate(booking.startTime)}</div>
                          <div>To: {formatDate(booking.endTime)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {booking.actualEntryTime || booking.actualExitTime ? (
                          <div className="text-sm">
                            {booking.actualEntryTime && (
                              <div className="text-green-600">
                                ✓ Entry: {formatTime(booking.actualEntryTime)}
                              </div>
                            )}
                            {booking.actualExitTime && (
                              <div className="text-purple-600">
                                ✓ Exit: {formatTime(booking.actualExitTime)}
                              </div>
                            )}
                            {!booking.actualEntryTime && (
                              <div className="text-gray-400 text-xs">Entry not recorded</div>
                            )}
                            {booking.actualEntryTime && !booking.actualExitTime && (
                              <div className="text-gray-400 text-xs">Currently parked</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">Not started</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {booking.actualEntryTime && booking.actualExitTime ? (
                          <div className="text-sm font-medium text-gray-900">
                            {calculateDuration(booking.actualEntryTime, booking.actualExitTime)}
                          </div>
                        ) : booking.actualEntryTime ? (
                          <div className="text-sm text-gray-500">
                            In progress...
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {booking.actualPrice > 0 ? (
                            <div>
                              <div className="font-semibold text-gray-900">
                                ৳{booking.actualPrice.toFixed(2)}
                              </div>
                              {booking.price !== booking.actualPrice && (
                                <div className="text-xs text-gray-500 line-through">
                                  Est: ৳{booking.price?.toFixed(2) || '0.00'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-500">
                              ৳{booking.price?.toFixed(2) || '0.00'}
                              <div className="text-xs text-gray-400">(estimated)</div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                          {booking.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.actualExitTime ? (
                          <div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(booking.paymentStatus)}`}>
                              {booking.paymentStatus?.toUpperCase() || 'PENDING'}
                            </span>
                            {booking.paymentStatus === 'paid' && booking.chargedAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid: {formatTime(booking.chargedAt)}
                              </div>
                            )}
                            {booking.paymentStatus === 'failed' && booking.paymentError && (
                              <div className="text-xs text-red-600 mt-1">
                                {booking.paymentError}
                              </div>
                            )}
                            {booking.paymentStatus === 'pending' && (
                              <div className="text-xs text-yellow-600 mt-1">
                                Manual payment required
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ How It Works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <p>Book a parking spot and wait for admin approval</p>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <p>When you arrive, the admin records your entry time</p>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <p>When you leave, the admin records your exit time</p>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <p>The system automatically calculates the fee based on actual time</p>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <p>If you have a saved payment method, you'll be charged automatically</p>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2">6.</span>
              <p>You'll receive a confirmation email with payment details</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>💡 Tip:</strong> Save a payment method in your account settings to enable automatic payments!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;


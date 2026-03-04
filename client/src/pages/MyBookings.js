import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const CANCELLABLE_STATUSES = ['pending', 'approved', 'booked', 'search_query'];
const canCancel = (b) => CANCELLABLE_STATUSES.includes(b.status);
// Show "Apply for refund" for any cancelled booking (appears after user presses Cancel); backend will say if no payment to refund
const canRefund = (b) => b.status === 'cancelled' && b.paymentStatus !== 'refunded';
const NOT_COMPLETED_STATUSES = ['pending', 'approved', 'booked', 'search_query', 'cancelled'];

const MyBookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCancelView = searchParams.get('view') === 'cancel';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

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

  const calculateDuration = (entryTime, exitTime) => {
    if (!entryTime || !exitTime) return 'N/A';
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const durationMs = exit.getTime() - entry.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleCancelBooking = async (bookingId) => {
    setActionLoadingId(bookingId);
    setError('');
    setSuccessMessage('');
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      await fetchBookings();
      setSuccessMessage('Booking cancelled. You can apply for a refund below if you were charged.');
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRequestRefund = async (bookingId) => {
    setActionLoadingId(bookingId);
    setError('');
    setSuccessMessage('');
    try {
      await api.post(`/bookings/${bookingId}/request-refund`);
      await fetchBookings();
      setSuccessMessage('Refund request submitted. If eligible, the amount will be credited to your payment method.');
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayedBookings = isCancelView
    ? bookings.filter((b) => NOT_COMPLETED_STATUSES.includes(b.status))
    : bookings;

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

  const locationIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const calendarIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  const clockIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const carIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h8M5 7v10a1 1 0 001 1h12a1 1 0 001-1V7" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe] text-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-purple-700 hover:text-purple-900 font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-center flex-1 min-w-[200px] bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            {isCancelView ? 'Cancel your booking' : 'My Bookings'}
          </h1>
          <div className="w-[140px] flex justify-end">
            {isCancelView ? (
              <Link to="/my-bookings" className="text-sm font-medium text-purple-600 hover:text-purple-800">
                View all
              </Link>
            ) : (
              <Link
                to="/my-bookings?view=cancel"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition text-sm"
              >
                Cancel a booking
              </Link>
            )}
          </div>
        </div>
        {isCancelView && (
          <p className="mb-6 text-gray-600 text-sm text-center">
            Only bookings that are not completed are shown. You can cancel or apply for a refund after cancelling.
          </p>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {displayedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl text-gray-600">
              {isCancelView ? 'No bookings to cancel' : 'No bookings found'}
            </p>
            <p className="text-gray-500 mt-2 text-sm">
              {isCancelView
                ? 'You have no pending, approved, or cancelled bookings.'
                : "You haven't made any parking bookings yet."}
            </p>
            {isCancelView ? (
              <Link to="/my-bookings" className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                View all bookings
              </Link>
            ) : (
              <Link to="/book-spot" className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                Book a Spot
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {displayedBookings.map((booking) => {
              const locationName = booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || booking.parkingLotName || booking.location || 'N/A';
              const spotLabel = booking.parkingSpot?.spotNum ? `Spot: ${booking.parkingSpot.spotNum}` : 'Not assigned';
              const vehicleType = booking.vehicle?.carType || booking.vehicleType || 'Car';
              const isCompleted = booking.status === 'completed';
              const isCancelled = booking.status === 'cancelled';
              const hasEntryExit = booking.actualEntryTime || booking.actualExitTime;
              const duration = booking.actualEntryTime && booking.actualExitTime
                ? calculateDuration(booking.actualEntryTime, booking.actualExitTime)
                : '-';
              const displayPrice = booking.actualPrice > 0 ? booking.actualPrice : (booking.price || 0);
              const isEstimated = !booking.actualExitTime || booking.actualPrice <= 0;

              return (
                <div
                  key={booking._id}
                  className="bg-gradient-to-r from-purple-50 to-white rounded-2xl shadow-md border border-purple-100/50 overflow-hidden"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    {/* Location & vehicle */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {locationIcon}
                      <div>
                        <p className="font-semibold text-gray-900">{locationName}</p>
                        <p className="text-sm text-gray-600">{spotLabel}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                          {carIcon}
                          <span>{vehicleType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Date / Entry–Exit */}
                    <div className="flex items-start gap-3 flex-shrink-0">
                      {calendarIcon}
                      <div className="text-sm text-gray-700">
                        {booking.startTime && booking.endTime ? (
                          <>
                            <p className="text-xs font-semibold text-gray-500 uppercase">DATE</p>
                            <p>{formatDate(booking.startTime)}</p>
                            <p className="mt-0.5 text-gray-500">to {formatDate(booking.endTime)}</p>
                          </>
                        ) : hasEntryExit ? (
                          <>
                            <p className="text-xs font-semibold text-gray-500 uppercase">ENTRY</p>
                            <p>{booking.actualEntryTime ? formatDate(booking.actualEntryTime) : '—'}</p>
                            <p className="text-xs font-semibold text-gray-500 uppercase mt-2">EXIT</p>
                            <p>{booking.actualExitTime ? formatDate(booking.actualExitTime) : '—'}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Not specified</p>
                        )}
                        {hasEntryExit && (
                          <div className="mt-2 space-y-0.5">
                            {booking.actualEntryTime && (
                              <p className="flex items-center gap-1.5 text-green-600 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Entry: {formatTime(booking.actualEntryTime)}
                              </p>
                            )}
                            {booking.actualExitTime && (
                              <p className="flex items-center gap-1.5 text-purple-600 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Exit: {formatTime(booking.actualExitTime)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Duration & status */}
                    <div className="flex items-start gap-3 flex-shrink-0">
                      {clockIcon}
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{duration}</p>
                        {!isCompleted && !isCancelled && (
                          <p className="text-gray-500 text-xs mt-0.5">Not started</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {isCompleted && (
                            <>
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Completed</span>
                              {booking.paymentStatus === 'paid' && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Paid</span>
                              )}
                            </>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cancelled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-sm">
                      <p className="font-semibold text-gray-900">৳{Number(displayPrice).toFixed(2)}</p>
                      {isEstimated && <p className="text-xs text-gray-500">(estimated)</p>}
                      {isCompleted && booking.price !== booking.actualPrice && booking.actualPrice > 0 && (
                        <p className="text-xs text-gray-500">Est: ৳{(booking.price || 0).toFixed(2)}</p>
                      )}
                      {booking.paymentStatus === 'paid' && booking.chargedAt && (
                        <p className="text-xs text-green-600 mt-0.5">Paid: {formatTime(booking.chargedAt)}</p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0 md:ml-auto">
                      {canCancel(booking) && !isCancelView && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking._id)}
                          disabled={actionLoadingId === booking._id}
                          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoadingId === booking._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      {canRefund(booking) && (
                        <button
                          type="button"
                          onClick={() => handleRequestRefund(booking._id)}
                          disabled={actionLoadingId === booking._id}
                          className="px-4 py-2 rounded-xl font-medium text-sm bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 transition"
                        >
                          {actionLoadingId === booking._id ? 'Processing...' : 'Apply for refund'}
                        </button>
                      )}
                      {booking.status === 'cancelled' && booking.paymentStatus === 'refunded' && (
                        <span className="text-sm text-purple-600 font-medium">Refunded</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Information Box */}
        <div className="mt-8 bg-purple-50/80 border border-purple-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">ℹ️ How It Works</h3>
          <div className="space-y-2 text-sm text-purple-800">
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
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-sm text-purple-700">
              <strong>💡 Tip:</strong> Save a payment method in your account settings to enable automatic payments!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;


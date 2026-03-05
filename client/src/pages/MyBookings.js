import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const CANCELLABLE_STATUSES = ['pending', 'approved', 'booked', 'search_query'];
const canCancel = (b) => CANCELLABLE_STATUSES.includes(b.status);

const isBookingInPast = (b) => {
  const d = b.startTime || b.date || b.endTime;
  if (!d) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return new Date(d) < startOfToday;
};
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
  const clockIconGray = (
    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const carIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h8M5 7v10a1 1 0 001 1h12a1 1 0 001-1V7" />
    </svg>
  );
  const bikeIcon = (
    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 18h2m-2 0v-4l4 2v-2m-4-2v-4l4 2m4-4v4l4-2m-4 2v4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe] text-gray-800 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-8">
        <div className="mb-6 md:mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-purple-700 hover:text-purple-900 font-medium shrink-0">
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center flex-1 min-w-0 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            {isCancelView ? 'Cancel your booking' : 'My Bookings'}
          </h1>
          <div className="w-[140px] flex justify-end shrink-0">
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
          <div className="space-y-0 w-full">
            {/* Shared grid template — full width, 8 columns */}
            <style>{`
              .my-bookings-grid { display: grid; gap: 0.75rem 1.25rem; align-items: center; width: 100%; }
              .my-bookings-grid .col-cell { min-width: 0; overflow: hidden; }
              @media (min-width: 768px) {
                .my-bookings-grid {
                  grid-template-columns: minmax(0,1.2fr) minmax(172px,1.45fr) minmax(108px,0.95fr) minmax(68px,0.5fr) minmax(82px,0.65fr) minmax(98px,0.8fr) minmax(98px,0.8fr) minmax(120px,auto);
                }
              }
            `}</style>

            {/* Column headers bar — matches cancel page design */}
            <div className="my-bookings-grid px-4 sm:px-5 lg:px-6 py-3 bg-white/80 rounded-t-2xl border border-b border-gray-200 hidden md:grid">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Parking Spot</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Booking Period</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Entry/Exit</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Duration</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Amount</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Status</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell">Payment</div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider col-cell text-center">Action</div>
            </div>

            <div className="space-y-3 pt-1">
            {displayedBookings.map((booking) => {
              const locationName = booking.parkingSpot?.parkingLotName || booking.parkingSpot?.parkinglotName || booking.parkingLotName || booking.location || 'N/A';
              const spotLabel = booking.parkingSpot?.spotNum ? `${booking.parkingSpot.spotNum}` : 'Not assigned';
              const spotNo = booking.parkingSpot?.floor != null ? `No: ${booking.parkingSpot.floor}` : '';
              const vehicleType = booking.vehicle?.carType || booking.vehicleType || 'Car';
              const isCompleted = booking.status === 'completed';
              const isCancelled = booking.status === 'cancelled';
              const hasEntryExit = booking.actualEntryTime || booking.actualExitTime;
              const durationParts = booking.actualEntryTime && booking.actualExitTime
                ? calculateDuration(booking.actualEntryTime, booking.actualExitTime).split(' ')
                : ['-', ''];
              const displayPrice = booking.actualPrice > 0 ? booking.actualPrice : (booking.price || 0);
              const isEstimated = !booking.actualExitTime || booking.actualPrice <= 0;

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full"
                >
                  <div className="my-bookings-grid px-4 sm:px-5 lg:px-6 py-5 gap-4 md:gap-6">
                    {/* 1. Parking Spot — only location/spot/vehicle */}
                    <div className="col-cell flex items-start gap-2 overflow-hidden">
                      {locationIcon}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{locationName}</p>
                        <p className="text-sm text-gray-600 truncate">{spotLabel}{spotNo ? `, ${spotNo}` : ''}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-600">
                          {/^bike|motorcycle|bicycle$/i.test(String(vehicleType)) ? bikeIcon : carIcon}
                          <span className="truncate">{vehicleType}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Booking Period — only calendar + DATE or ENTRY/EXIT dates */}
                    <div className="col-cell flex items-start gap-2 overflow-hidden">
                      {calendarIcon}
                      <div className="min-w-0 flex-1 text-sm text-gray-800">
                        {booking.startTime && booking.endTime ? (
                          <>
                            <p className="text-xs font-semibold text-gray-500 uppercase">DATE</p>
                            <p className="truncate">{formatDate(booking.startTime)}</p>
                          </>
                        ) : hasEntryExit ? (
                          <>
                            <p className="text-xs font-semibold text-gray-500 uppercase">ENTRY</p>
                            <p className="truncate">{booking.actualEntryTime ? formatDate(booking.actualEntryTime) : '—'}</p>
                            <p className="text-xs font-semibold text-gray-500 uppercase mt-1.5">EXIT</p>
                            <p className="truncate">{booking.actualExitTime ? formatDate(booking.actualExitTime) : '—'}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Not specified</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Entry/Exit — only "Not started" or Entry/Exit times with dots */}
                    <div className="col-cell flex items-start gap-2 overflow-hidden">
                      {hasEntryExit ? (
                        <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                          {booking.actualEntryTime && (
                            <p className="flex items-center gap-1.5 text-green-600 text-xs truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" aria-hidden /> Entry: {formatTime(booking.actualEntryTime)}
                            </p>
                          )}
                          {booking.actualExitTime && (
                            <p className="flex items-center gap-1.5 text-purple-600 text-xs truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" aria-hidden /> Exit: {formatTime(booking.actualExitTime)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          {clockIconGray}
                          <p className="text-sm text-gray-500">Not started</p>
                        </div>
                      )}
                    </div>

                    {/* 4. Duration — fixed-height slot so icon + value are at the same place every row */}
                    <div className="col-cell flex items-start overflow-hidden">
                      <div className="flex items-center gap-2 h-12 min-w-0">
                        {clockIcon}
                        <div className="text-sm min-w-0 flex flex-col justify-center leading-tight">
                          {durationParts[0] === '-' ? (
                            <span className="font-medium text-gray-900">-</span>
                          ) : (
                            <>
                              <span className="font-medium text-gray-900">{durationParts[0]}</span>
                              {durationParts[1] ? <span className="text-gray-700">{durationParts[1]}</span> : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 5. Amount — only ৳ amount and (estimated) or Est: */}
                    <div className="col-cell text-sm overflow-hidden">
                      <p className="font-semibold text-gray-900">৳{Number(displayPrice).toFixed(2)}</p>
                      {isEstimated && <p className="text-xs text-gray-500">(estimated)</p>}
                      {isCompleted && booking.price != null && booking.price !== booking.actualPrice && booking.actualPrice > 0 && (
                        <p className="text-xs text-gray-500">Est: ৳{(booking.price || 0).toFixed(2)}</p>
                      )}
                    </div>

                    {/* 6. Status — only status badge (icon + text in one pill), centered in column */}
                    <div className="col-cell flex justify-center overflow-hidden">
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white whitespace-nowrap">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelled
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500 text-white whitespace-nowrap">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </span>
                      )}
                      {!isCompleted && !isCancelled && <span className="text-xs text-gray-400">—</span>}
                    </div>

                    {/* 7. Payment — only Paid badge + time or empty, centered in column */}
                    <div className="col-cell flex flex-col items-center overflow-hidden">
                      {booking.paymentStatus === 'paid' ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500 text-white whitespace-nowrap">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Paid
                          </span>
                          {booking.chargedAt && <p className="text-xs text-gray-500 mt-0.5">Paid: {formatTime(booking.chargedAt)}</p>}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* 8. Action — only button or empty, centered in column */}
                    <div className="col-cell flex justify-center overflow-hidden">
                      {canCancel(booking) && !isBookingInPast(booking) && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking._id)}
                          disabled={actionLoadingId === booking._id}
                          className="px-4 py-2 text-sm font-semibold text-red-800 bg-red-100 rounded-xl hover:bg-red-200 disabled:opacity-50 transition"
                        >
                          {actionLoadingId === booking._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      {canCancel(booking) && isBookingInPast(booking) && (
                        <span className="text-xs text-gray-500">Past booking</span>
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
          </div>
        )}

        {/* How It Works — same on every view (cancel page design) */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold" aria-hidden>
              i
            </span>
            How It Works
          </h3>
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">1.</span>
              <p>Book a parking spot and wait for admin approval</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">2.</span>
              <p>When you arrive, the admin records your entry time</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">3.</span>
              <p>When you leave, the admin records your exit time</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">4.</span>
              <p>The system automatically calculates the fee based on actual time</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">5.</span>
              <p>If you have a saved payment method, you'll be charged automatically</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 shrink-0">6.</span>
              <p>You'll receive a confirmation email with payment details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;


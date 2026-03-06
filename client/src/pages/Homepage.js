import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import ParkSmarterLogo from '../components/ParkSmarterLogo';

const OFFER_CARD_THEMES = [
  { bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { bg: 'bg-purple-50', border: 'border-purple-100' },
  { bg: 'bg-pink-50', border: 'border-pink-100' },
  { bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { bg: 'bg-amber-50', border: 'border-amber-100' },
];

const Homepage = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const notificationRef = useRef(null);

  const [activeOffers, setActiveOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [isOfferTransitioning, setIsOfferTransitioning] = useState(false);
  const offerTimeoutRef = useRef(null);
  const [offerCardTheme, setOfferCardTheme] = useState(OFFER_CARD_THEMES[0]);

  const pickRandomOfferTheme = (previous) => {
    if (OFFER_CARD_THEMES.length <= 1) return OFFER_CARD_THEMES[0];
    let next = previous;
    for (let attempts = 0; attempts < 5 && next === previous; attempts += 1) {
      next = OFFER_CARD_THEMES[Math.floor(Math.random() * OFFER_CARD_THEMES.length)];
    }
    return next || OFFER_CARD_THEMES[0];
  };

  let user = {};
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
    user = {};
  }

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch chat unread count for badge on chat icon (user: from admin; admin: from users)
  useEffect(() => {
    const u = (() => {
      try {
        const s = localStorage.getItem('user');
        return s ? JSON.parse(s) : {};
      } catch {
        return {};
      }
    })();
    if (!u?.role) return;
    const fetchChatUnread = async () => {
      try {
        const res = await api.get('/chat/unread-count');
        setChatUnreadCount(res.data?.unreadCount ?? 0);
      } catch {
        setChatUnreadCount(0);
      }
    };
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active offers for the homepage slider
  useEffect(() => {
    let isMounted = true;

    setOfferCardTheme((prev) => pickRandomOfferTheme(prev));

    const fetchActiveOffers = async () => {
      setOffersLoading(true);
      setOffersError('');
      try {
        const response = await api.get('/offers/active');
        const offers = response.data?.offers || [];
        if (!isMounted) return;
        setActiveOffers(Array.isArray(offers) ? offers : []);
        setActiveOfferIndex(0);
      } catch (error) {
        if (!isMounted) return;
        setOffersError(error.response?.data?.message || 'Failed to load active offers');
        setActiveOffers([]);
      } finally {
        if (!isMounted) return;
        setOffersLoading(false);
      }
    };

    fetchActiveOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Rotate through offers one-by-one
  useEffect(() => {
    if (!activeOffers || activeOffers.length <= 1) return;

    const interval = setInterval(() => {
      setIsOfferTransitioning(true);

      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }

      offerTimeoutRef.current = setTimeout(() => {
        setActiveOfferIndex((index) => (index + 1) % activeOffers.length);
        setOfferCardTheme((prev) => pickRandomOfferTheme(prev));
        setIsOfferTransitioning(false);
      }, 350);
    }, 4000);

    return () => {
      clearInterval(interval);
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
        offerTimeoutRef.current = null;
      }
    };
  }, [activeOffers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const u = (() => {
        try {
          const s = localStorage.getItem('user');
          return s ? JSON.parse(s) : {};
        } catch {
          return {};
        }
      })();

      if (u?.role === 'admin') {
        const res = await api.get('/admin/notifications');
        const list = res.data?.notifications || [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.read).length);
        return;
      }

      // Fetch user bookings for booking-related notifications
      const bookingsResponse = await api.get('/bookings');
      const bookings = bookingsResponse.data?.bookings || [];

      // Create notifications for approved/booked bookings - only show if email was actually sent
      // Only show for bookings that were recently updated (within last hour) to indicate email was just sent
      const bookingNotifications = bookings
        .filter(booking => {
          if (booking.status !== 'booked' && booking.status !== 'approved') return false;
          // Only show if email was actually sent
          if (!booking.emailSent) return false;
          // Only show if booking was recently updated (within last hour)
          const updatedAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.createdAt);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return updatedAt > oneHourAgo;
        })
        .map(booking => {
          const updatedAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.createdAt);
          
          return {
            id: `email-sent-${booking._id}`,
            type: 'email',
            title: 'Email Sent',
            message: `An email has been sent to your account regarding your booking. Please check your mail.`,
            time: updatedAt,
            read: false,
            link: '/book-spot'
          };
        });

      // Add notifications for rejected bookings - only show if email was actually sent
      // Only show for bookings that were recently rejected (within last hour)
      const rejectedNotifications = bookings
        .filter(booking => {
          if (booking.status !== 'rejected') return false;
          // Only show if email was actually sent
          if (!booking.emailSent) return false;
          // Only show if booking was recently updated (within last hour)
          const updatedAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.createdAt);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return updatedAt > oneHourAgo;
        })
        .map(booking => {
          const updatedAt = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.createdAt);
          
          return {
            id: `email-sent-rejected-${booking._id}`,
            type: 'email',
            title: 'Email Sent',
            message: `An email has been sent to your account regarding your booking. Please check your mail.`,
            time: updatedAt,
            read: false,
            link: '/book-spot'
          };
        });

      // Add upcoming booking reminders (bookings starting within 24 hours)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcomingBookings = bookings
        .filter(booking => {
          if (!booking.startTime || booking.status !== 'booked') return false;
          const start = new Date(booking.startTime);
          return start > now && start <= tomorrow;
        })
        .map(booking => {
          const spotName = booking.parkingSpot?.area || 'Parking Spot';
          const parkingLotName = booking.parkingSpot?.parkingLotName || 'parking lot';
          const startTime = new Date(booking.startTime);
          
          return {
            id: `reminder-${booking._id}`,
            type: 'reminder',
            title: 'Upcoming Booking',
            message: `Your booking at ${parkingLotName} (${spotName}) starts in less than 24 hours.`,
            time: startTime,
            read: false,
            link: '/book-spot'
          };
        });

      // Add notifications for pending bookings (to show request submitted)
      const pendingNotifications = bookings
        .filter(booking => booking.status === 'pending' || booking.status === 'search_query')
        .map(booking => {
          const parkingLotName = booking.parkingSpot?.parkingLotName || booking.parkingLotName || 'parking lot';
          
          return {
            id: `pending-${booking._id}`,
            type: 'pending',
            title: 'Booking Request Submitted',
            message: `Your parking request at ${parkingLotName} has been submitted and is pending admin approval. You will receive an email notification once it's reviewed.`,
            time: new Date(booking.createdAt),
            read: false,
            link: '/book-spot'
          };
        });

      // Combine all notifications
      const allNotifications = [...bookingNotifications, ...rejectedNotifications, ...pendingNotifications, ...upcomingBookings];
      
      // Sort by time (newest first)
      allNotifications.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Set empty notifications on error
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    const u = (() => {
      try {
        const s = localStorage.getItem('user');
        return s ? JSON.parse(s) : {};
      } catch {
        return {};
      }
    })();
    if (u?.role === 'admin') {
      try {
        await api.patch(`/admin/notifications/${notificationId}/read`);
      } catch (e) {
        console.error('Mark notification read:', e);
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
    const u = (() => {
      try {
        const s = localStorage.getItem('user');
        return s ? JSON.parse(s) : {};
      } catch {
        return {};
      }
    })();
    if (u?.role === 'admin') {
      try {
        await api.patch('/admin/notifications/read-all');
      } catch (e) {
        console.error('Mark all read:', e);
      }
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 bg-white/70 backdrop-blur-md border-b border-indigo-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <ParkSmarterLogo size={48} className="flex-shrink-0 shadow-lg" />
          <div>
            <p className="text-sm text-indigo-500 font-semibold">Park Smarter</p>
            <p className="text-xs text-gray-500">Your centralized operations hub</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Notification Button */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotifications}
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition font-semibold"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-indigo-50">
                  <h3 className="font-semibold text-indigo-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-80">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-lg mb-2">🔕</p>
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              window.location.href = notification.link;
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                              !notification.read ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.time).toLocaleString()}
                              </p>
                            </div>
                            {notification.type === 'email' && (
                              <span className="flex-shrink-0 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                Email
                              </span>
                            )}
                            {notification.type === 'booking' && (
                              <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Booking
                              </span>
                            )}
                            {notification.type === 'reminder' && (
                              <span className="flex-shrink-0 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                Reminder
                              </span>
                            )}
                            {notification.type === 'pending' && (
                              <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Pending
                              </span>
                            )}
                            {notification.type === 'booking_cancelled' && (
                              <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message / Chat icon - outline bubble + gradient notification badge (green to purple) */}
          {user && user.role !== 'admin' && (
            <Link
              to="/chat"
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
              title={chatUnreadCount > 0 ? 'New messages from admin' : 'Chat with admin'}
              aria-label={chatUnreadCount > 0 ? 'Chat with admin (new messages)' : 'Open chat'}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-tr from-[#00CC66] to-[#6633FF] px-1 text-[11px] font-bold text-white shadow-sm">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/chat"
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
              title={chatUnreadCount > 0 ? 'New messages from users' : 'Chat with users'}
              aria-label={chatUnreadCount > 0 ? 'Chat with users (new messages)' : 'Open admin chat'}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-tr from-[#00CC66] to-[#6633FF] px-1 text-[11px] font-bold text-white shadow-sm">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition font-semibold"
          >
            <span>↪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 lg:px-0 mt-10 text-center">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <ParkSmarterLogo size={48} className="flex-shrink-0" />
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-800">
            Welcome to Park Smarter{user.name ? `, ${user.name}` : ''}
          </h1>
        </div>
        <p className="mt-3 text-gray-600 text-lg">
          Efficiently manage your parking operations with our comprehensive system. Choose an option below to get started.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto px-4 lg:px-0 mt-12 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Only - Hide these boxes for admins */}
          {user && (!user.role || user.role === 'user') && (
            <>
              <Link
                  to="/book-spot"
                  className={`col-span-3 group rounded-3xl ${offerCardTheme.bg} shadow-[0_20px_60px_-25px_rgba(63,81,181,0.35)] p-8 border ${offerCardTheme.border} hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(63,81,181,0.45)] transition`}
                  >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-100 text-indigo-600 text-3xl mb-4">
                        🎁
                      </div>
                    </div>

                    {activeOffers.length > 0 && !offersLoading && !offersError && (
                      <span className="flex-shrink-0 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full mt-1">
                        {activeOfferIndex + 1}/{activeOffers.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {offersLoading && (
                      <div className="animate-pulse">
                        <div className="h-4 bg-indigo-50 rounded w-2/3" />
                        <div className="h-4 bg-indigo-50 rounded w-1/2 mt-3" />
                        <div className="h-4 bg-indigo-50 rounded w-1/3 mt-3" />
                      </div>
                    )}

                    {!offersLoading && offersError && (
                      <p className="text-sm text-red-600">{offersError}</p>
                    )}

                    {!offersLoading && !offersError && activeOffers.length === 0 && (
                      <p className="text-gray-600">No active offers right now.</p>
                    )}

                    {!offersLoading && !offersError && activeOffers.length > 0 && (
                      <div
                        className={`transition-all duration-500 ${
                          isOfferTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
                        }`}
                      >
                        <p className="text-lg font-semibold text-indigo-900">
                          {activeOffers[activeOfferIndex]?.parkingLotName || 'Parking Lot'}
                          {typeof activeOffers[activeOfferIndex]?.offerPercentage === 'number'
                            ? ` — ${activeOffers[activeOfferIndex].offerPercentage}% off`
                            : ''}
                        </p>

                        <p className="text-sm text-gray-600 mt-2">
                          Valid until{' '}
                          {activeOffers[activeOfferIndex]?.endDate
                            ? new Date(activeOffers[activeOfferIndex].endDate).toLocaleDateString()
                            : '—'}
                        </p>

                        {activeOffers[activeOfferIndex]?.notes && (
                          <p className="text-sm text-gray-600 mt-2">{activeOffers[activeOfferIndex].notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                  </Link>
              <Link
                to="/vehicles"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(63,81,181,0.35)] p-8 border border-indigo-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(63,81,181,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-100 text-indigo-600 text-3xl mb-4">
                  🚙
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Manage Vehicles</h3>
                <p className="text-gray-600 leading-relaxed">
                  View, add, and manage all vehicles in the parking system. Track parking spots and vehicle details.
                </p>
              </Link>

              <Link
                to="/chat"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(99,102,241,0.35)] p-8 border border-indigo-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(99,102,241,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 text-blue-600 text-3xl mb-4">
                  💬
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Chat with Admin</h3>
                <p className="text-gray-600 leading-relaxed">
                  Ask questions or get help directly from an admin.
                </p>
              </Link>

              <Link
                to="/book-spot"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(99,102,241,0.35)] p-8 border border-indigo-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(99,102,241,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 text-purple-600 text-3xl mb-4">
                  📅
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Spot Pre-Booking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Reserve a specific parking spot for a future time and date. Get instant confirmation via email.
                </p>
              </Link>

              <Link
                to="/feedback"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(63,81,181,0.35)] p-8 border border-indigo-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(63,81,181,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 text-3xl mb-4">
                  💬
                  
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Feedback</h3>
                <p className="text-gray-600 leading-relaxed">
                  Share your thoughts and suggestions. Help us improve the parking management experience.
                </p>
              </Link>
              <Link
                to="/my-feedback"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(168,85,247,0.35)] p-8 border border-purple-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(168,85,247,0.45)] transition"
                >
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 text-purple-600 text-3xl mb-4">
                  📋
                  </div>
                  <h3 className="text-xl font-semibold text-indigo-900 mb-2">My Feedback</h3>
                  <p className="text-gray-600 leading-relaxed">
                    View all feedback you've submitted. Check the status of your suggestions and complaints.
                  </p>
              </Link>
                  <Link
                  to="/all-spots"
                  className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(63,81,181,0.35)] p-8 border border-indigo-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(63,81,181,0.45)] transition"
                  >
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 text-3xl mb-4">
                    🔍
                  </div>
                  <h3 className="text-xl font-semibold text-indigo-900 mb-2">Search Spots</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Search and view all available parking spots across different lots. 
                  </p>
                  </Link>

              <Link
                to="/payment-method"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(34,197,94,0.35)] p-8 border border-green-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(34,197,94,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 text-green-600 text-3xl mb-4">
                  💳
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Payment Method</h3>
                <p className="text-gray-600 leading-relaxed">
                  Save your payment method for automatic parking fee payments. Enable seamless checkout when exiting.
                </p>
              </Link>

              <Link
                to="/my-bookings"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(139,92,246,0.35)] p-8 border border-purple-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(139,92,246,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 text-purple-600 text-3xl mb-4">
                  📋
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">My Bookings</h3>
                <p className="text-gray-600 leading-relaxed">
                  View all your parking bookings, entry/exit times, payment status, and transaction history.
                </p>
              </Link>

              <Link
                to="/my-bookings?view=cancel"
                className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(239,68,68,0.35)] p-8 border border-red-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(239,68,68,0.45)] transition"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 text-red-600 text-3xl mb-4">
                  ✕
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-2">Cancel your booking</h3>
                <p className="text-gray-600 leading-relaxed">
                  View and cancel bookings that are not yet completed. After cancelling, you can apply for a refund here.
                </p>
              </Link>
              
            </>
          )}


          

          {/* Admin Only - Add Spot Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/spots"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(255,193,7,0.35)] p-8 border border-yellow-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(255,193,7,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-yellow-100 text-yellow-600 text-3xl mb-4">
                ➕
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Add Spot to Parking Places</h3>
              <p className="text-gray-600 leading-relaxed">
                Admin: Add new parking spots to the system. Manage parking availability and locations.
              </p>
            </Link>
          )}

          {user && user.role === 'admin' && (
            <Link
              to="/admin/spot-requests"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(59,130,246,0.35)] p-8 border border-blue-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(59,130,246,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 text-blue-600 text-3xl mb-4">
                📝
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Approve Parking Spots</h3>
              <p className="text-gray-600 leading-relaxed">
                Review parking owner requests and approve to create the parking lot and requested spots.
              </p>
            </Link>
          )}

          {/* Admin Only - Offer Management Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/add-offer"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(236,72,153,0.35)] p-8 border border-pink-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(236,72,153,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-pink-100 text-pink-600 text-3xl mb-4">
                🎟️
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Create Parking Offers</h3>
              <p className="text-gray-600 leading-relaxed">
                Launch promotional rates for any parking lot and boost occupancy during key hours.
              </p>
            </Link>
          )}

          {/* Admin Only - Approve Bookings Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/bookings"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(239,68,68,0.35)] p-8 border border-red-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(239,68,68,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 text-red-600 text-3xl mb-4">
                ✅
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Approve Bookings</h3>
              <p className="text-gray-600 leading-relaxed">
                Review and approve pending parking spot booking requests from users.
              </p>
            </Link>
          )}


          {/* Admin Only - Admin Feedback Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/feedback"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(139,92,246,0.35)] p-8 border border-purple-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(139,92,246,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 text-purple-600 text-3xl mb-4">
                📊
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Admin Feedback Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                View and manage all user feedback. Resolve feedback and monitor user suggestions.
              </p>
            </Link>
            
          )}


          {/* Admin Only - Admin Fines Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/fines"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(220,38,38,0.35)] p-8 border border-red-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(220,38,38,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 text-red-600 text-3xl mb-4">
                ⚖️
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Admin Fines Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor and manage parking fines for overtime vehicles. Issue fines, mark as paid, or waive fines.
              </p>
            </Link>
          )}
          {/* Admin Only - Reports Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/reports"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(59,130,246,0.35)] p-8 border border-blue-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(59,130,246,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 text-blue-600 text-3xl mb-4">
                📈
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Admin Reports</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate revenue, peak usage, occupancy, and customer trend reports.
              </p>
            </Link>
          )}

          {/* Admin Only - Chat Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/chat"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(16,185,129,0.35)] p-8 border border-emerald-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(16,185,129,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 text-3xl mb-4">
                💬
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Admin Chat</h3>
              <p className="text-gray-600 leading-relaxed">
                View user threads and reply to messages.
              </p>
            </Link>
          )}

          {/* Admin Only - Vehicle Lookup Card */}
          {user && user.role === 'admin' && (
            <Link
              to="/admin/vehicle-lookup"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(59,130,246,0.35)] p-8 border border-blue-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(59,130,246,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 text-blue-600 text-3xl mb-4">
                🔍
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Vehicle Lookup</h3>
              <p className="text-gray-600 leading-relaxed">
                Retrieve vehicle details when confirmation is lost. Search by license plate, email, or phone.
              </p>
            </Link>
          )}

          {/* Live Map Card */}
            <Link
              to="/live-map"
              className="group rounded-3xl bg-white shadow-[0_20px_60px_-25px_rgba(0,128,0,0.35)] p-8 border border-green-50 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(0,128,0,0.45)] transition"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 text-green-600 text-3xl mb-4">
                🗺️
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Parking Map</h3>
              <p className="text-gray-600 leading-relaxed">
                View real-time parking availability on an interactive map. See nearby parking lots with color-coded availability status.
              </p>
            </Link>
        </div>
      </div>
    </div>
  );
};

export default Homepage;


import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Homepage from './pages/Homepage';
import Vehicles from './pages/Vehicles';
import Feedback from './pages/Feedback';
import MyFeedback from './pages/MyFeedback';
import BookSpot from './pages/BookSpot';
import AllSpots from './pages/AllSpots';
import AdminSpots from './pages/AdminSpots';
import AdminBookings from './pages/AdminBookings';
import AdminFeedback from './pages/AdminFeedback';
import AdminFines from './pages/AdminFines';
import UserFines from './pages/UserFines';
import Chat from './pages/Chat';
import AdminChat from './pages/AdminChat';
import PaymentMethod from './pages/PaymentMethod';
import MyBookings from './pages/MyBookings';
import AddOffer from './pages/AddOffer';
import AdminVehicleLookup from './pages/AdminVehicleLookup';
import LiveMap from './pages/LiveMap';
import AdminReports from './pages/AdminReports';
import AdminSpotRequests from './pages/AdminSpotRequests';
import ContactUs from './pages/ContactUs';
import RefundPolicy from './pages/ReturnRefundPolicy';
import Faq from './pages/Faq';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AboutUs from './pages/AboutUs';
import TermsConditions from './pages/TermsConditions';

import OwnerLogin from './pages/OwnerLogin';
import OwnerRegister from './pages/OwnerRegister';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerSpotRequests from './pages/OwnerSpotRequests';
import OwnerApprovalStatus from './pages/OwnerApprovalStatus';

import Footer from './components/Footer';
import ParkSmarterLogo from './components/ParkSmarterLogo';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const [user, setUser] = useState(() => {
    try {
      return localStorage.getItem('user');
    } catch (e) {
      return null;
    }
  });

  const parsedUser = (() => {
    try {
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  })();

  const isOwner = parsedUser && (parsedUser.role === 'owner' || parsedUser.role === 'parkingowner');

  // Modal states
  const [showOwnerRegister, setShowOwnerRegister] = useState(false);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        setUser(storedUser);
      } catch (e) {
        console.error('Error reading from localStorage:', e);
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener('storage', checkUser);
    window.addEventListener('localStorageChange', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('localStorageChange', checkUser);
    };
  }, []);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (showOwnerRegister || showOwnerLogin) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showOwnerRegister, showOwnerLogin]);

  return (
    <Router>
      <ScrollToTop />
      <div className="relative min-h-screen flex flex-col">
        <div className="relative z-10 flex-1 flex flex-col">
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  isOwner ? <OwnerDashboard /> : <Homepage />
                ) : (
                  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
                    {/* Grid Pattern Overlay */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                      }}
                    ></div>

                    <div className="relative z-10 min-h-screen flex flex-col px-6 md:px-12 lg:px-16 py-8">
                      {/* Top Left Badge */}
                      <div className="mb-12">
                        <div className="inline-flex items-center gap-2 bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-2">
                          <span className="text-white text-xl">⚡</span>
                          <span className="text-white font-medium">Next-Gen Parking Solution</span>
                        </div>
                      </div>

                      {/* Main Content Area */}
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left Side Content */}
                        <div className="space-y-8">
                          {/* Main Title with Logo */}
                          <div className="flex items-center gap-4">
                            <ParkSmarterLogo size={72} className="flex-shrink-0" />
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                              <span className="text-white">Park </span>
                              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                                Smarter
                              </span>
                            </h1>
                          </div>

                          {/* Descriptive Text */}
                          <p className="text-xl md:text-2xl text-white leading-relaxed">
                            Experience the future of parking management. AI-powered, seamless, and designed for the modern world.
                          </p>

                          {/* Feature List */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-white text-2xl">⚡</span>
                              <span className="text-white text-lg">Instant space detection</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-white text-2xl">🛡️</span>
                              <span className="text-white text-lg">Bank-level security</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-white text-2xl">🕐</span>
                              <span className="text-white text-lg">Real-time updates</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Get Started Panel */}
                        <div className="flex justify-center lg:justify-end">
                          <div className="w-full max-w-md bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-purple-500 border-opacity-30 shadow-2xl">
                            {/* Logo at top */}
                            <div className="flex justify-center mb-6">
                              <ParkSmarterLogo size={80} className="flex-shrink-0" />
                            </div>

                            {/* Heading */}
                            <h2 className="text-3xl font-bold text-white text-center mb-2">
                              Get Started
                            </h2>

                            {/* Sub-heading */}
                            <p className="text-gray-300 text-center mb-8">
                              Choose your path to better parking
                            </p>

                            {/* Login Button */}
                            <Link
                              to="/login"
                              className="block w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-lg font-semibold text-lg text-center mb-4 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
                            >
                              Login
                            </Link>

                            {/* Separator */}
                            <div className="flex items-center justify-center my-6">
                              <span className="text-gray-400">or</span>
                            </div>

                            {/* Registration Button */}
                            <Link
                              to="/register"
                              className="block w-full py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg text-center transition-all shadow-lg hover:shadow-xl"
                            >
                              Registration
                            </Link>

                            {/* Owner Section */}
                            <div className="pt-6 border-t border-gray-700 mt-4">
                              <p className="text-center text-gray-300 mb-5">
                                Are you a parking owner?
                              </p>

                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setShowOwnerLogin(true)}
                                  className="py-3 border border-indigo-400/70 text-indigo-200 hover:bg-indigo-900/30 rounded-lg font-medium text-center transition-colors"
                                >
                                  Sign In
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowOwnerRegister(true)}
                                  className="py-3 border border-indigo-400/70 text-indigo-200 hover:bg-indigo-900/30 rounded-lg font-medium text-center transition-colors"
                                >
                                  Sign Up
                                </button>
                              </div>
                            </div>

                            {/* Security Message */}
                            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-gray-700">
                              <span className="text-green-400 text-xl">🛡️</span>
                              <span className="text-green-400 text-sm">Secured with 256-bit encryption</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* === How Park Smarter Works Section (smaller fonts like in your edited image) === */}
                      <div className="mt-16 mb-20 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
                          How Park Smarter Works
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-6xl mx-auto px-4">
                          {/* Step 1 */}
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-purple-500/30 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                            <div className="mx-auto mb-5 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-purple-600/90 text-white text-4xl md:text-5xl shadow-lg">
                              📍
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                              Find & Book
                            </h3>
                            <p className="text-gray-200 text-base md:text-lg leading-relaxed">
                              Search real-time spots<br />
                              See price & availability
                            </p>
                          </div>

                          {/* Step 2 */}
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-purple-500/30 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                            <div className="mx-auto mb-5 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-purple-600/90 text-white text-4xl md:text-5xl shadow-lg">
                              💳
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                              Park & Pay
                            </h3>
                            <p className="text-gray-200 text-base md:text-lg leading-relaxed">
                              
                              Pay via bKash/Nagad/Card
                            </p>
                          </div>

                          {/* Step 3 */}
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-purple-500/30 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                            <div className="mx-auto mb-5 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-purple-600/90 text-white text-4xl md:text-5xl shadow-lg">
                              😊
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                              Enjoy & Save
                            </h3>
                            <p className="text-gray-200 text-base md:text-lg leading-relaxed">
                              Enjoy the best service everytime
                              
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Feature Cards at Bottom */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pb-8">
                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">Smart Analytics</h3>
                          <p className="text-gray-200">AI-powered insights for optimal space utilization</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">Contactless Payment</h3>
                          <p className="text-gray-200">Seamless transactions with multiple payment options</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">Mobile First</h3>
                          <p className="text-gray-200">Manage everything from your smartphone</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            />

            {/* Owner routes */}
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/spot-requests" element={<OwnerSpotRequests />} />
            <Route path="/owner/approval-status" element={<OwnerApprovalStatus />} />

            {/* Admin routes */}
            <Route path="/admin/spots" element={<AdminSpots />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/fines" element={<AdminFines />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/vehicle-lookup" element={<AdminVehicleLookup />} />
            <Route path="/admin/add-offer" element={<AddOffer />} />
            <Route path="/admin/spot-requests" element={<AdminSpotRequests />} />

            {/* Other public routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/book-spot" element={<BookSpot />} />
            <Route path="/all-spots" element={<AllSpots />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/my-feedback" element={<MyFeedback />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin/chat" element={<AdminChat />} />
            <Route path="/payment-method" element={<PaymentMethod />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/live-map" element={<LiveMap />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
          </Routes>

          {/* Owner Register Modal */}
          {showOwnerRegister && (
            <OwnerRegister
              isOpen={showOwnerRegister}
              onClose={() => setShowOwnerRegister(false)}
            />
          )}

          {/* Owner Login Modal */}
          {showOwnerLogin && (
            <OwnerLogin
              isOpen={showOwnerLogin}
              onClose={() => setShowOwnerLogin(false)}
            />
          )}
        </div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
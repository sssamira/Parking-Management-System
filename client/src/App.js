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
import ContactUs from './pages/ContactUs';
import RefundPolicy from './pages/ReturnRefundPolicy';
import Faq from './pages/Faq';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AboutUs from './pages/AboutUs';
import TermsConditions from './pages/TermsConditions';

function App() {
  const [user, setUser] = useState(() => {
    try {
      return localStorage.getItem('user');
    } catch (e) {
      return null;
    }
  });

  // Update user state when localStorage changes
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

    // Check immediately
    checkUser();

    // Listen for storage changes (for cross-tab/window updates)
    window.addEventListener('storage', checkUser);
    // Listen for custom event (for same-window updates)
    window.addEventListener('localStorageChange', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('localStorageChange', checkUser);
    };
  }, []);

  return (
    <Router>
      <div className="relative min-h-screen">

        {/* Content Container */}
        <div className="relative z-10">
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Homepage />
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
                          {/* Main Title */}
                          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                            <span className="text-white">Park </span>
                            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                              Smarter
                            </span>
                          </h1>
                          
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
                            {/* Car Icon */}
                            <div className="flex justify-center mb-6">
                              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
                                <span className="text-white text-4xl">🚗</span>
                              </div>
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
                            
                            {/* Security Message */}
                            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-gray-700">
                              <span className="text-green-400 text-xl">🛡️</span>
                              <span className="text-green-400 text-sm">Secured with 256-bit encryption</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Feature Cards at Bottom */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pb-8">
                        {/* Smart Analytics Card */}
                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">
                            Smart Analytics
                          </h3>
                          <p className="text-gray-200">
                            AI-powered insights for optimal space utilization
                          </p>
                        </div>
                        
                        {/* Contactless Payment Card */}
                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">
                            Contactless Payment
                          </h3>
                          <p className="text-gray-200">
                            Seamless transactions with multiple payment options
                          </p>
                        </div>
                        
                        {/* Mobile First Card */}
                        <div className="bg-gradient-to-br from-blue-800 to-purple-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">
                            Mobile First
                          </h3>
                          <p className="text-gray-200">
                            Manage everything from your smartphone
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/book-spot" element={<BookSpot />} />
            <Route path="/all-spots" element={<AllSpots />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/my-feedback" element={<MyFeedback />} />
            <Route path="/admin/spots" element={<AdminSpots />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/fines" element={<AdminFines />} />
            <Route path="/my-fines" element={<UserFines />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin/chat" element={<AdminChat />} />
            <Route path="/payment-method" element={<PaymentMethod />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/admin/add-offer" element={<AddOffer />} />
            <Route path="/admin/vehicle-lookup" element={<AdminVehicleLookup />} />
            <Route path="/live-map" element={<LiveMap />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/*" element={<AdminReports />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

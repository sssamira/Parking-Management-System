import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Homepage from './pages/Homepage';
import Vehicles from './pages/Vehicles';
import Feedback from './pages/Feedback';
import MyFeedback from './pages/MyFeedback';
import BookSpot from './pages/BookSpot';
import AllSpots from './pages/AllSpots';
import AdminSpots from './pages/AdminSpots';
import AdminBookings from './pages/AdminBookings';
import Chat from './pages/Chat';
import AdminChat from './pages/AdminChat';

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
        {/* Fixed Background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(https://assets.bwbx.io/images/users/iqjWHBFdfxIU/iA7GVdn9DpeY/v1/-1x-1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>

        {/* Overlay for better readability */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-0"></div>

        {/* Content Container */}
        <div className="relative z-10">
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Homepage />
                ) : (
                  <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
                    <div className="max-w-md mx-auto bg-white bg-opacity-95 backdrop-blur-sm p-6 rounded-lg shadow-xl text-center">
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        Parking Management System
                      </h1>
                      <p className="text-gray-600 mb-6">Welcome to the Parking Management System</p>
                      <p className="text-gray-600 mb-6">Please choose an option to continue.</p>
                      <div className="space-y-4">
                        <Link
                          to="/register"
                          className="block w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold text-lg"
                        >
                          Registration
                        </Link>
                        <Link
                          to="/login"
                          className="block w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-semibold text-lg"
                        >
                          Login
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/book-spot" element={<BookSpot />} />
            <Route path="/all-spots" element={<AllSpots />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/my-feedback" element={<MyFeedback />} />
            <Route path="/admin/spots" element={<AdminSpots />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin/chat" element={<AdminChat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

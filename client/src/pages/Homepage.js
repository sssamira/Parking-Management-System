import React from 'react';
import { Link } from 'react-router-dom';

const Homepage = () => {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 bg-white/70 backdrop-blur-md border-b border-indigo-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-300/60">
            <span className="text-white text-2xl">🚗</span>
          </div>
          <div>
            <p className="text-sm text-indigo-500 font-semibold">Parking Management System</p>
            <p className="text-xs text-gray-500">Your centralized operations hub</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition font-semibold"
        >
          <span>↪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 lg:px-0 mt-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-indigo-800">
          Welcome to Parking Management{user.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-3 text-gray-600 text-lg">
          Efficiently manage your parking operations with our comprehensive system. Choose an option below to get started.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto px-4 lg:px-0 mt-12 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </div>
    </div>
  );
};

export default Homepage;


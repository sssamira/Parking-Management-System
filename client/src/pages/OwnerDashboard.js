// src/pages/OwnerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      navigate('/owner/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && (parsed.role === 'owner' || parsed.role === 'parkingowner')) {
        setUser(parsed);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/owner/login');
      }
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/owner/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('localStorageChange'));
    // Small delay to ensure state updates before redirect
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-lg text-indigo-600 dark:text-indigo-400 animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              Parking Owner Panel
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Welcome{user.name ? `, ${user.name}` : ''} 👋
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Active Spots</h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">24</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">+3 this week</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">৳4500</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Parking Spot Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
            <div className="text-4xl mb-6">🅿️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Parking Spot Requests
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Submit new parking spot creation requests for your facility. All requests go through admin approval.
            </p>
            <Link
              to="/owner/spot-requests"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-colors"
            >
              Create New Request →
            </Link>
          </div>

          {/* Approval Status */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
            <div className="text-4xl mb-6">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Approval Status
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Track the status of your submitted requests: pending, approved, or rejected.
            </p>
            <Link
              to="/owner/approval-status"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md transition-colors"
            >
              View Status →
            </Link>
          </div>
        </div>

        {/* Optional: Recent Activity or Quick Links */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            
          </Link>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
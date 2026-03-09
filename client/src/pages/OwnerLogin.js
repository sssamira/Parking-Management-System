// src/pages/OwnerLogin.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const OwnerLogin = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const response = await api.post('/auth/owner/login', payload);

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
      }
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      window.dispatchEvent(new Event('localStorageChange'));
      setSuccess(true);

      setTimeout(() => {
        onClose();
        window.location.href = '/owner/dashboard';
      }, 1500);
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-purple-950 to-indigo-950 rounded-2xl shadow-2xl border border-purple-700/40 overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-purple-900/70 text-white hover:bg-purple-800 transition-colors shadow-md focus:outline-none"
          aria-label="Close login modal"
        >
          <span className="text-2xl leading-none">×</span>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[90vh] p-8 pt-14 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-950/30">
          {/* Header with Icon */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
              <span className="text-3xl">📊</span> {/* Parking/business icon */}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Parking Owner Portal
            </h2>
            <p className="mt-2 text-gray-300 text-sm md:text-base">
              Access your parking management dashboard
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-xl border border-green-700/50 bg-green-900/40 p-4 text-center text-green-300">
              Login successful! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-700/50 bg-red-900/40 p-4 text-center text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Business Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">
                  ✉️
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="business@parking.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-purple-950/60 border border-purple-700/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">
                  🔒
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-4 py-3.5 bg-purple-950/60 border border-purple-700/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg disabled:opacity-60 transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Security Footer */}
          <div className="mt-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <span>🛡️</span>
            <span>Secured with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
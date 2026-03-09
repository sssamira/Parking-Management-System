// src/pages/OwnerRegister.jsx
import React, { useState } from 'react';
import api from '../utils/api';

const OwnerRegister = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',               // ← added (required by backend)
    businessName: '',
    email: '',
    phone: '',

    location: '',
    password: '',
    confirmPassword: '',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),                 // ← sent to backend
        businessName: formData.businessName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),           // ← sent to backend
        driverLicense: formData.driverLicense.trim(), // ← sent to backend
        location: formData.location.trim(),
        password: formData.password,
      };

      const response = await api.post('/auth/register-owner', payload);

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
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[9999] flex h-10 w-10 items-center justify-center rounded-full bg-purple-900/80 text-white hover:bg-purple-700 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Close registration modal"
          title="Close"
        >
          <span className="text-3xl leading-none font-normal">×</span>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh] p-8 pt-16 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-950/40">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Register Your Parking Business
            </h2>
            <p className="mt-2 text-gray-300">
              Start managing your parking spaces efficiently
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-xl border border-green-700/50 bg-green-900/40 p-4 text-center text-green-300">
              Registration successful! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-700/50 bg-red-900/40 p-4 text-center text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Owner Name (sent as "name") */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Owner Name</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">👤</span>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Business Name</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">🏢</span>
                <input
                  type="text"
                  name="businessName"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="ABC Parking Solutions"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Business Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">✉️</span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="business@parking.com"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">☎️</span>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address (required by backend) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Address</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">🏠</span>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, Country"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Driver License (required by backend) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Driver License Number</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">🪪</span>
                <input
                  type="text"
                  name="driverLicense"
                  required
                  value={formData.driverLicense}
                  onChange={handleChange}
                  placeholder="DL-123456789"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Parking Location (optional – keep if needed) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Parking Location </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">📍</span>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="123 Main St, City"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">🔒</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400 text-xl">🔒</span>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="block w-full rounded-xl border border-purple-700/50 bg-purple-950/60 px-12 py-3.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-60"
            >
              {loading ? 'Registering...' : 'Register Business'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>🛡️</span>
            <span>Secured with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;
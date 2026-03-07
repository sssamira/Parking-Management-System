import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const OwnerLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
        window.location.href = '/owner/dashboard';
      }, 1000);
    } catch (err) {
      const message = err.response?.data?.message || 'Owner login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f8ff] to-[#e6edff] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
        <h1 className="text-2xl font-bold text-indigo-900 mb-2">Parking Owner Sign In</h1>
        <p className="text-gray-600 mb-6">Sign in to manage your parking lot operations.</p>

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
            Login successful. Redirecting to dashboard...
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In as Parking Owner'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 text-center">
          Need an owner account?{' '}
          <Link to="/owner/register" className="text-indigo-700 font-semibold hover:underline">
            Sign up as parking owner
          </Link>
        </div>

        <div className="mt-2 text-sm text-gray-600 text-center">
          Regular user?{' '}
          <Link to="/login" className="text-indigo-700 font-semibold hover:underline">
            Go to normal sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;

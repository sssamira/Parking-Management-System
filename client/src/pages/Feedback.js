import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const Feedback = () => {
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    category: 'Experience'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to submit feedback. Please login first.');
      }

      const response = await api.post('/feedback', formData);
      
      // Set success message
      setSuccess('Feedback submitted successfully! Thank you for your input.');
      
      // Reset form
      setFormData({
        rating: 5,
        comment: '',
        category: 'Experience'
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to submit feedback';
      setError(errorMessage);
      console.error('Feedback submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
    // Clear messages when user starts typing
    setError('');
    setSuccess('');
  };

  return (
    <div className="relative min-h-screen">
      {/* Fixed Background (same as App.js) */}
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

      {/* Content Container - LARGER FORM LIKE FIRST IMAGE */}
      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto bg-white bg-opacity-95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Submit Feedback</h1>
          
          {/* Success Message */}
          {success && (
            <div className="mb-8 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
              <div className="text-blue-600 font-bold text-2xl mb-2">
                ✓ Feedback submitted successfully!
              </div>
              <div className="text-blue-700 text-lg">
                Thank you for your input.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                Rating (1-5)
              </label>
              <input
                type="number"
                name="rating"
                min="1"
                max="5"
                value={formData.rating}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              >
                <option value="Complaint">Complaint</option>
                <option value="Suggestion">Suggestion</option>
                <option value="Experience">Experience</option>
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-2">
                Your Feedback
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                rows="6"
                placeholder="Share your experience, suggestions, or issues..."
                required
                minLength="10"
              />
              <p className="text-sm text-gray-600 mt-2">
                Minimum 10 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Feedback'}
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-10 text-center">
            <Link
              to="/"
              className="text-indigo-600 hover:text-indigo-800 text-lg font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
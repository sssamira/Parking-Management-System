import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Feedback = () => {
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    category: 'Experience'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to submit feedback. Please login first.');
      }

      const response = await fetch('http://localhost:3001/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      alert('Feedback submitted successfully! Thank you for your input.');
      
      // Reset form
      setFormData({
        rating: 5,
        comment: '',
        category: 'Experience'
      });
    } catch (err) {
      setError(err.message);
      console.error('Feedback submission error:', err);
    } finally {
      setLoading(false);
    }
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

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white bg-opacity-95 backdrop-blur-sm p-6 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Submit Feedback</h1>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Complaint">Complaint</option>
                <option value="Suggestion">Suggestion</option>
                <option value="Experience">Experience</option>
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Feedback
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows="4"
                placeholder="Share your experience, suggestions, or issues..."
                required
                minLength="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Feedback'}
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-indigo-600 hover:text-indigo-800 text-sm"
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
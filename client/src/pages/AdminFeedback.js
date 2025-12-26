import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api'; // Import the Axios instance

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllFeedback();
  }, []);

  const fetchAllFeedback = async () => {
    try {
      setLoading(true);
      
      // Use Axios instead of fetch
      const response = await api.get('/feedback');
      
      // Axios automatically parses JSON, no .json() needed
      const data = response.data;
      
      // Handle authorization errors
      if (response.status === 401 || response.status === 403) {
        setError('You are not authorized to view all feedback. Admin access required.');
        setLoading(false);
        return;
      }

      setFeedbacks(data.data || []);
    } catch (err) {
      // Axios error handling
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to load feedback';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, isResolved) => {
    try {
      // Use Axios instead of fetch
      const response = await api.put(`/feedback/${id}`, { isResolved });
      
      // No need to check response.ok, Axios throws for non-2xx
      
      // Update local state
      setFeedbacks(prev => 
        prev.map(fb => 
          fb._id === id ? { ...fb, isResolved } : fb
        )
      );
      
      alert(`Feedback marked as ${isResolved ? 'Resolved' : 'Pending'}`);
    } catch (err) {
      // Axios error handling
      console.error('Error updating status:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to update status';
      alert('Failed to update status: ' + errorMessage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
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
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
              Admin Feedback Dashboard
            </h1>
            <p className="text-gray-600 text-center">
              Manage all user feedback
            </p>
          </div>

          {/* Navigation */}
          <div className="mb-6 flex justify-between items-center">
            <Link
              to="/"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to Home
            </Link>
            <button
              onClick={fetchAllFeedback}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Feedback Yet
              </h3>
              <p className="text-gray-600 mb-6">
                No feedback has been submitted yet.
              </p>
            </div>
          ) : (
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {feedbacks.map((feedback) => (
                      <tr key={feedback._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {feedback.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {feedback.user?.email || 'No email'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-bold">
                            {feedback.rating}/5 ⭐
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {feedback.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700 text-sm">
                            {feedback.comment}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(feedback.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            feedback.isResolved 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {feedback.isResolved ? 'Resolved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            {!feedback.isResolved ? (
                              <button
                                onClick={() => handleUpdateStatus(feedback._id, true)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                Mark Resolved
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(feedback._id, false)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                              >
                                Mark Pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFeedback;
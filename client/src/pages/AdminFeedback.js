import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

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
      const response = await api.get('/feedback');
      const data = response.data;
      
      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        setError('You are not authorized to view all feedback. Admin access required.');
        return;
      }

      setFeedbacks(data.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load feedback';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, isResolved) => {
    try {
      await api.put(`/feedback/${id}`, { isResolved });
      setFeedbacks(prev => 
        prev.map(fb => 
          fb._id === id ? { ...fb, isResolved } : fb
        )
      );
      alert(`Feedback marked as ${isResolved ? 'Resolved' : 'Pending'}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update status';
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
    <div className="min-h-screen bg-[#f0f4ff]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">
                Admin Feedback Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage all user feedback
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              Back Home
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-8">
          <button
            onClick={fetchAllFeedback}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm"
          >
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center shadow-sm">
            {error}
          </div>
        )}

        {/* Loading / Empty / Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
            <span className="ml-4 text-xl text-gray-700">Loading feedback...</span>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xl border border-gray-200">
            <div className="text-7xl mb-6">📭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Feedback Yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              No user feedback has been submitted yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedbacks.map((feedback) => (
                    <tr key={feedback._id} className="hover:bg-gray-50 transition-colors">
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
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                              className="px-4 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(feedback._id, false)}
                              className="px-4 py-1.5 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition"
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
  );
};

export default AdminFeedback;
// src/pages/OwnerApprovalStatus.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OwnerApprovalStatus = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/owner/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser && (parsedUser.role === 'owner' || parsedUser.role === 'parkingowner')) {
        setUser(parsedUser);
        fetchMyRequests();
      } else {
        navigate('/owner/login');
      }
    } catch (e) {
      navigate('/owner/login');
    }
  }, [navigate]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/spot-requests/mine');
      setRequests(response.data?.requests || response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Approval Status
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Track the status of your parking spot creation requests
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchMyRequests}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">
              Loading your requests...
            </span>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center">
            <div className="text-6xl mb-6 text-gray-300 dark:text-gray-600">📭</div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              No Requests Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              You haven't submitted any parking spot requests. Create one to get started!
            </p>
            <button
              onClick={() => navigate('/owner/spot-requests')}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-colors"
            >
              Create New Request →
            </button>
          </div>
        ) : (
          /* Requests List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {request.parkingLotName || 'Unnamed Request'}
                    </h3>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(
                        request.status
                      )}`}
                    >
                      {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Pending'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <strong className="text-gray-800 dark:text-gray-200">Area:</strong>{' '}
                      {request.area || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-gray-800 dark:text-gray-200">Floor:</strong>{' '}
                      {request.floor || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-gray-800 dark:text-gray-200">Spots:</strong>{' '}
                      {request.numberOfSpots || 0}
                    </p>
                    <p>
                      <strong className="text-gray-800 dark:text-gray-200">Price/hour:</strong>{' '}
                      ৳{request.pricePerHour || 'N/A'}
                    </p>
                    <p>
                      <strong className="text-gray-800 dark:text-gray-200">Submitted:</strong>{' '}
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>

                  {request.adminNote && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Admin Note:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {request.adminNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerApprovalStatus;
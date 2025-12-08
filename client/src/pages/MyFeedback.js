import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MyFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to view feedback');
      }

      const response = await fetch('http://localhost:3001/api/feedback/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedbacks(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
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

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Complaint': return 'bg-red-100 text-red-800';
      case 'Suggestion': return 'bg-blue-100 text-blue-800';
      case 'Experience': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
              My Feedback History
            </h1>
            <p className="text-gray-600 text-center">
              View all feedback you have submitted
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
            <Link
              to="/feedback"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Submit New Feedback
            </Link>
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
              <p className="mt-4 text-gray-600">Loading your feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Feedback Yet
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't submitted any feedback yet. Share your experience to help us improve!
              </p>
              <Link
                to="/feedback"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Submit Your First Feedback
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feedback Stats */}
              <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Feedback Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {feedbacks.length}
                    </div>
                    <div className="text-sm text-blue-800">Total Submissions</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(1)}
                    </div>
                    <div className="text-sm text-green-800">Average Rating</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {feedbacks.filter(fb => fb.category === 'Suggestion').length}
                    </div>
                    <div className="text-sm text-purple-800">Suggestions</div>
                  </div>
                </div>
              </div>

              {/* Feedback List */}
              <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  All Feedback ({feedbacks.length})
                </h2>
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div
                      key={feedback._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`text-lg font-bold ${getRatingColor(feedback.rating)}`}>
                            {feedback.rating}/5
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(feedback.category)}`}>
                            {feedback.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(feedback.createdAt)}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{feedback.comment}</p>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div>
                          Status: 
                          <span className={`ml-2 px-2 py-1 rounded ${feedback.isResolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {feedback.isResolved ? 'Resolved' : 'Pending'}
                          </span>
                        </div>
                        <div>
                          ID: {feedback._id.substring(feedback._id.length - 6)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyFeedback;
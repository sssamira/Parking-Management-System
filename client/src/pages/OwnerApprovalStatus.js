import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OwnerApprovalStatus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      const isOwner = userData && (userData.role === 'owner' || userData.role === 'parkingowner');
      if (!isOwner) {
        navigate('/owner/login');
        return;
      }
      setUser(userData);
      fetchMyRequests();
    } catch (e) {
      navigate('/owner/login');
    }
  }, [navigate]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/spot-requests/mine');
      setRequests(response.data?.requests || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="text-2xl font-bold text-indigo-900">Approval Status</h1>
        <p className="text-gray-600 mt-1 mb-4">Track your pending, approved, and rejected spot requests.</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

        {loading ? (
          <p className="text-gray-600">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-600">No requests submitted yet.</p>
        ) : (
          <div className="space-y-3 max-h-[620px] overflow-auto">
            {requests.map((request) => (
              <div key={request._id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-indigo-900">{request.parkingLotName}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    request.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : request.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Area: {request.area} | Floor: {request.floor}</p>
                <p className="text-sm text-gray-600">Spots: {request.numberOfSpots} | Price: ৳{request.pricePerHour}</p>
                {request.adminNote && (
                  <p className="text-sm text-gray-700 mt-2">Admin note: {request.adminNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerApprovalStatus;

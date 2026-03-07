import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminSpotRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user || user.role !== 'admin') {
        navigate('/');
        return;
      }
      fetchPending();
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await api.get('/spot-requests/admin/pending?status=pending');
      setRequests(response.data?.requests || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      setError('');
      setSuccess('');
      const response = await api.patch(`/spot-requests/admin/${id}/approve`, {});
      const createdCount = response.data?.spotCreationResult?.count || 0;
      const lotCreated = response.data?.lotCreated ? ' and parking lot created' : '';
      setSuccess(`Request approved${lotCreated}. ${createdCount} spot(s) created.`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || 'Approve failed');
    } finally {
      setProcessingId('');
    }
  };

  const handleReject = async (id) => {
    try {
      setProcessingId(id);
      setError('');
      setSuccess('');
      await api.patch(`/spot-requests/admin/${id}/reject`, { adminNote: 'Rejected by admin' });
      setSuccess('Request rejected successfully.');
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || 'Reject failed');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-900">Approve Parking Spot Requests</h1>
            <p className="text-gray-600 mt-1">Admin queue for parking owner spot creation requests.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-semibold"
          >
            Back Home
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>}

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {loading ? (
            <p className="text-gray-600">Loading pending requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-gray-600">No pending requests right now.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request._id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-indigo-900">{request.parkingLotName}</h3>
                      <p className="text-sm text-gray-600 mt-1">Owner: {request.ownerId?.name || 'Unknown'} ({request.ownerId?.email || 'no-email'})</p>
                      <p className="text-sm text-gray-600">Area: {request.area} | Floor: {request.floor}</p>
                      <p className="text-sm text-gray-600">Spots: {request.numberOfSpots} | Vehicle: {request.vehicleType} | Price: ৳{request.pricePerHour}</p>
                      {Array.isArray(request.tags) && request.tags.length > 0 && (
                        <p className="text-sm text-gray-600">Tags: {request.tags.join(', ')}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request._id)}
                        disabled={processingId === request._id}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request._id)}
                        disabled={processingId === request._id}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSpotRequests;

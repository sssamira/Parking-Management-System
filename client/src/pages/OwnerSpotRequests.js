import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OwnerSpotRequests = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    area: '',
    floor: '',
    parkingLotName: '',
    vehicleType: 'All',
    pricePerHour: '',
    tags: '',
    numberOfSpots: '1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      const isOwner = userData && (userData.role === 'owner' || userData.role === 'parkingowner');
      if (!isOwner) {
        navigate('/owner/login');
        return;
      }
      setUser(userData);
    } catch (e) {
      navigate('/owner/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const tags = formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

      const payload = {
        area: formData.area,
        floor: parseInt(formData.floor, 10),
        parkingLotName: formData.parkingLotName,
        vehicleType: formData.vehicleType,
        pricePerHour: parseFloat(formData.pricePerHour) || 50,
        numberOfSpots: parseInt(formData.numberOfSpots, 10) || 1,
        ...(tags.length > 0 && { tags }),
      };

      await api.post('/spot-requests', payload);
      setSuccess('Request submitted. Admin approval is required before spots are created.');
      setFormData({
        area: '',
        floor: '',
        parkingLotName: '',
        vehicleType: 'All',
        pricePerHour: '',
        tags: '',
        numberOfSpots: '1',
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-4">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Home
            </button>
          </div>

          <h1 className="text-2xl font-bold text-indigo-900">Request Parking Spot Creation</h1>
          <p className="text-gray-600 mt-1 mb-4">Same form as admin add-spots, but it sends approval request to admin.</p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Spots *</label>
                <select
                  name="numberOfSpots"
                  value={formData.numberOfSpots}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area *</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Main Parking Lot"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Lot Name *</label>
                <input
                  type="text"
                  name="parkingLotName"
                  value={formData.parkingLotName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., MacDonalds"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="All">All</option>
                  <option value="Car">Car</option>
                  <option value="Bike">Bike</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Hour (৳) *</label>
                <input
                  type="number"
                  name="pricePerHour"
                  value={formData.pricePerHour}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional, comma separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="covered, near entrance"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Submitting Request...' : 'Send Request to Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OwnerSpotRequests;

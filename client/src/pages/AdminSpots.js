import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const AdminSpots = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    spotNum: '',
    area: '',
    floor: '',
    parkingLotName: '',
    vehicleType: 'All',
    pricePerHour: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is admin
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (userData.role !== 'admin') {
          navigate('/');
        }
      } else {
        navigate('/login');
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
      navigate('/login');
    }

    // Pre-fill parking lot name from URL parameter if present
    const parkingLotNameParam = searchParams.get('parkingLotName');
    if (parkingLotNameParam) {
      setFormData(prev => ({
        ...prev,
        parkingLotName: decodeURIComponent(parkingLotNameParam)
      }));
      setSuccess(`Parking Lot Name pre-filled: ${decodeURIComponent(parkingLotNameParam)}. Please add spots for this parking lot.`);
    }
  }, [navigate, searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Parse tags if provided
      const tags = formData.tags 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const payload = {
        spotNum: formData.spotNum,
        area: formData.area,
        floor: parseInt(formData.floor),
        parkingLotName: formData.parkingLotName,
        vehicleType: formData.vehicleType,
        pricePerHour: parseFloat(formData.pricePerHour) || 50,
        ...(tags.length > 0 && { tags })
      };

      const response = await api.post('/parking', payload);
      
      setSuccess(`✅ Parking spot "${formData.area} - Spot ${formData.spotNum}" added successfully!`);
      
      // Reset form
      setFormData({
        spotNum: '',
        area: '',
        floor: '',
        parkingLotName: '',
        vehicleType: 'All',
        pricePerHour: '',
        tags: ''
      });
    } catch (err) {
      console.error('Error creating spot:', err);
      setError(err.response?.data?.message || 'Failed to create parking spot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-indigo-900">Add Parking Spot</h1>
          <p className="text-gray-600 mt-2">Admin: Add new parking spots to the system</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spot Number *
                </label>
                <input
                  type="text"
                  name="spotNum"
                  value={formData.spotNum}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., A-101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area *
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Main Parking Lot"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor *
                </label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parking Lot Name *
                </label>
                <select
                  name="parkingLotName"
                  value={formData.parkingLotName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Location</option>
                  <optgroup label="Shopping Malls">
                    <option value="Bashundhara City">Bashundhara City</option>
                    <option value="Jamuna Future Park">Jamuna Future Park</option>
                    <option value="Shimanto Shambhar">Shimanto Shambhar</option>
                    <option value="Eastern Plaza">Eastern Plaza</option>
                    <option value="New Market">New Market</option>
                    <option value="City Centre">City Centre</option>
                    <option value="Aarong">Aarong</option>
                    <option value="Gulshan 1 Shopping Complex">Gulshan 1 Shopping Complex</option>
                    <option value="Gulshan 2 Shopping Complex">Gulshan 2 Shopping Complex</option>
                  </optgroup>
                  <optgroup label="Hospitals">
                    <option value="Apollo Hospital">Apollo Hospital</option>
                    <option value="Square Hospital">Square Hospital</option>
                    <option value="United Hospital">United Hospital</option>
                    <option value="Ibn Sina Hospital">Ibn Sina Hospital</option>
                    <option value="Labaid Hospital">Labaid Hospital</option>
                    <option value="Popular Hospital">Popular Hospital</option>
                    <option value="Dhaka Medical College Hospital">Dhaka Medical College Hospital</option>
                    <option value="Bangabandhu Sheikh Mujib Medical University">Bangabandhu Sheikh Mujib Medical University</option>
                  </optgroup>
                  <optgroup label="Educational Institutions">
                    <option value="University of Dhaka">University of Dhaka</option>
                    <option value="North South University">North South University</option>
                    <option value="BRAC University">BRAC University</option>
                    <option value="Independent University Bangladesh">Independent University Bangladesh</option>
                    <option value="American International University">American International University</option>
                    <option value="East West University">East West University</option>
                    <option value="Daffodil International University">Daffodil International University</option>
                  </optgroup>
                  <optgroup label="Airports & Transport">
                    <option value="Hazrat Shahjalal International Airport">Hazrat Shahjalal International Airport</option>
                    <option value="Kamalapur Railway Station">Kamalapur Railway Station</option>
                    <option value="Gabtoli Bus Terminal">Gabtoli Bus Terminal</option>
                    <option value="Sayedabad Bus Terminal">Sayedabad Bus Terminal</option>
                  </optgroup>
                  <optgroup label="Entertainment & Recreation">
                    <option value="National Museum">National Museum</option>
                    <option value="Bangladesh National Zoo">Bangladesh National Zoo</option>
                    <option value="Hatirjheel">Hatirjheel</option>
                    <option value="Gulshan Lake Park">Gulshan Lake Park</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All</option>
                  <option value="Car">Car</option>
                  <option value="Bike">Bike</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Hour (৳) *
                </label>
                <input
                  type="number"
                  name="pricePerHour"
                  value={formData.pricePerHour}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (Optional - comma separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., covered, near entrance, disabled"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Adding Spot...' : 'Add Parking Spot'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSpots;




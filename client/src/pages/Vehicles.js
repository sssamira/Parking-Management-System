import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Vehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    licensePlate: '',
    carType: '',
    carModel: '',
    carColor: '',
    carYear: '',
  });
  const [bulkVehicles, setBulkVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Motorcycle', 'Other'];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data.vehicles);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load vehicles');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBulkVehicleChange = (index, field, value) => {
    const updated = [...bulkVehicles];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setBulkVehicles(updated);
  };

  const handleNumberSubmit = (e) => {
    e.preventDefault();
    if (numberOfVehicles < 1) {
      setError('Minimum 1 vehicle is required. Please enter a number greater than 0');
      setNumberOfVehicles(1);
      return;
    }
    
    const newVehicles = Array.from({ length: numberOfVehicles }, () => ({
      licensePlate: '',
      carType: '',
      carModel: '',
      carColor: '',
      carYear: '',
    }));
    setBulkVehicles(newVehicles);
    setShowNumberInput(false);
    setShowAddForm(true);
    setError('');
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    for (let i = 0; i < bulkVehicles.length; i++) {
      const vehicle = bulkVehicles[i];
      if (!vehicle.licensePlate || !vehicle.carType || !vehicle.carModel || !vehicle.carColor || !vehicle.carYear) {
        setError(`Please fill all fields for Vehicle ${i + 1}`);
        setSubmitting(false);
        return;
      }
    }

    try {
      for (const vehicle of bulkVehicles) {
        await api.post('/vehicles', vehicle);
      }
      
      setBulkVehicles([]);
      setShowAddForm(false);
      setNumberOfVehicles(1);
      fetchVehicles();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add vehicles');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, formData);
        setShowAddForm(false);
        setEditingVehicle(null);
        setFormData({
          licensePlate: '',
          carType: '',
          carModel: '',
          carColor: '',
          carYear: '',
        });
      }
      fetchVehicles();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      licensePlate: vehicle.licensePlate,
      carType: vehicle.carType,
      carModel: vehicle.carModel,
      carColor: vehicle.carColor,
      carYear: vehicle.carYear,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await api.delete(`/vehicles/${vehicleId}`);
      fetchVehicles();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete vehicle');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setShowNumberInput(false);
    setEditingVehicle(null);
    setBulkVehicles([]);
    setNumberOfVehicles(1);
    setFormData({
      licensePlate: '',
      carType: '',
      carModel: '',
      carColor: '',
      carYear: '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Navigation */}
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">My Vehicles</h1>
              <p className="text-gray-600 mt-1">Manage your registered vehicles</p>
            </div>
            {/* No buttons here anymore */}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Number Input Form for Bulk Add */}
        {showNumberInput && !showAddForm && (
          <div className="mb-8 bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              How many vehicles do you want to add?
            </h2>
            <form onSubmit={handleNumberSubmit} className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Vehicles (Minimum: 1)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={numberOfVehicles}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setNumberOfVehicles(value < 1 ? 1 : value);
                  }}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter number"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Add / Edit Form */}
        {showAddForm && (
          <div className="mb-8 bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingVehicle ? 'Edit Vehicle' : `Add ${bulkVehicles.length} Vehicle${bulkVehicles.length > 1 ? 's' : ''}`}
              </h2>
              <button
                onClick={cancelForm}
                className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>

            {bulkVehicles.length > 0 ? (
              <form onSubmit={handleBulkSubmit} className="space-y-8">
                {bulkVehicles.map((vehicle, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Vehicle {index + 1}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          License Plate *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.licensePlate}
                          onChange={(e) => handleBulkVehicleChange(index, 'licensePlate', e.target.value.toUpperCase())}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Car Type *
                        </label>
                        <select
                          required
                          value={vehicle.carType}
                          onChange={(e) => handleBulkVehicleChange(index, 'carType', e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select type</option>
                          {carTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Car Model *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.carModel}
                          onChange={(e) => handleBulkVehicleChange(index, 'carModel', e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Car Color *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.carColor}
                          onChange={(e) => handleBulkVehicleChange(index, 'carColor', e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Car Year *
                        </label>
                        <input
                          type="number"
                          required
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={vehicle.carYear}
                          onChange={(e) => handleBulkVehicleChange(index, 'carYear', e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {submitting ? 'Adding...' : `Add ${bulkVehicles.length} Vehicle${bulkVehicles.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              </form>
            ) : editingVehicle && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Plate *
                    </label>
                    <input
                      type="text"
                      name="licensePlate"
                      required
                      value={formData.licensePlate}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Car Type *
                    </label>
                    <select
                      name="carType"
                      required
                      value={formData.carType}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select type</option>
                      {carTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Car Model *
                    </label>
                    <input
                      type="text"
                      name="carModel"
                      required
                      value={formData.carModel}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Car Color *
                    </label>
                    <input
                      type="text"
                      name="carColor"
                      required
                      value={formData.carColor}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Car Year *
                    </label>
                    <input
                      type="number"
                      name="carYear"
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.carYear}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Update Vehicle
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-7xl mb-6">🚗</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              No Vehicles Registered Yet
            </h3>
            <p className="text-gray-600 mb-8">
              Add your first vehicle to get started.
            </p>
            <button
              onClick={() => setShowNumberInput(true)}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-md"
            >
              + Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      {vehicle.licensePlate}
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="text-indigo-600 hover:text-indigo-800 text-xl"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {vehicles.length > 1 && (
                        <button
                          onClick={() => handleDelete(vehicle._id)}
                          className="text-red-600 hover:text-red-800 text-xl"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <p><span className="font-medium">Type:</span> {vehicle.carType}</p>
                    <p><span className="font-medium">Model:</span> {vehicle.carModel}</p>
                    <p><span className="font-medium">Color:</span> {vehicle.carColor}</p>
                    <p><span className="font-medium">Year:</span> {vehicle.carYear}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Button */}
            <div className="col-span-full text-center mt-6">
              <button
                onClick={() => setShowNumberInput(true)}
                className="px-8 py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition shadow-md"
              >
                + Add More Vehicle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vehicles;
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
    
    // Create array of empty vehicle forms
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

    // Validate all vehicles
    for (let i = 0; i < bulkVehicles.length; i++) {
      const vehicle = bulkVehicles[i];
      if (!vehicle.licensePlate || !vehicle.carType || !vehicle.carModel || !vehicle.carColor || !vehicle.carYear) {
        setError(`Please fill all fields for Vehicle ${i + 1}`);
        setSubmitting(false);
        return;
      }
    }

    try {
      // Add vehicles one by one
      for (const vehicle of bulkVehicles) {
        await api.post('/vehicles', vehicle);
      }
      
      // Reset form
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none"
          >
            Logout
          </button>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Vehicles</h1>
            {!showAddForm && !showNumberInput && (
              <button
                onClick={() => setShowNumberInput(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                + Add Vehicle
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Number Input Form */}
          {showNumberInput && !showAddForm && (
            <div className="mb-6 border border-gray-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                How many vehicles do you want to add?
              </h2>
              <form onSubmit={handleNumberSubmit} className="flex items-end gap-4">
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
                          if (value < 1) {
                            setNumberOfVehicles(1);
                          } else {
                            setNumberOfVehicles(value);
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          if (value < 1) {
                            setNumberOfVehicles(1);
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter number (minimum 1)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        You can add as many vehicles as you want (minimum 1)
                      </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNumberInput(false);
                      setNumberOfVehicles(1);
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bulk Vehicle Forms */}
          {showAddForm && bulkVehicles.length > 0 && (
            <div className="mb-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Add {bulkVehicles.length} Vehicle{bulkVehicles.length > 1 ? 's' : ''}
                </h2>
                <button
                  onClick={cancelForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none text-sm"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {bulkVehicles.map((vehicle, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Vehicle {index + 1}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          License Plate *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.licensePlate}
                          onChange={(e) => handleBulkVehicleChange(index, 'licensePlate', e.target.value.toUpperCase())}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Car Type *
                        </label>
                        <select
                          required
                          value={vehicle.carType}
                          onChange={(e) => handleBulkVehicleChange(index, 'carType', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="">Select car type</option>
                          {carTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Car Model *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.carModel}
                          onChange={(e) => handleBulkVehicleChange(index, 'carModel', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Car Color *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicle.carColor}
                          onChange={(e) => handleBulkVehicleChange(index, 'carColor', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Car Year *
                        </label>
                        <input
                          type="number"
                          required
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={vehicle.carYear}
                          onChange={(e) => handleBulkVehicleChange(index, 'carYear', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding Vehicles...' : `Add ${bulkVehicles.length} Vehicle${bulkVehicles.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Single Vehicle Edit Form */}
          {showAddForm && editingVehicle && bulkVehicles.length === 0 && (
            <div className="mb-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">
                Edit Vehicle
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      License Plate *
                    </label>
                    <input
                      type="text"
                      name="licensePlate"
                      required
                      value={formData.licensePlate}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Car Type *
                    </label>
                    <select
                      name="carType"
                      required
                      value={formData.carType}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select car type</option>
                      {carTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Car Model *
                    </label>
                    <input
                      type="text"
                      name="carModel"
                      required
                      value={formData.carModel}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Car Color *
                    </label>
                    <input
                      type="text"
                      name="carColor"
                      required
                      value={formData.carColor}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {vehicles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No vehicles registered yet.</p>
              <button
                onClick={() => setShowNumberInput(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add Your First Vehicle
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vehicle.licensePlate}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {vehicles.length > 1 && (
                          <button
                            onClick={() => handleDelete(vehicle._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Type:</span> {vehicle.carType}</p>
                      <p><span className="font-medium">Model:</span> {vehicle.carModel}</p>
                      <p><span className="font-medium">Color:</span> {vehicle.carColor}</p>
                      <p><span className="font-medium">Year:</span> {vehicle.carYear}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add More Vehicle Button - Always visible when vehicles exist */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setShowNumberInput(true);
                    setShowAddForm(false);
                    setBulkVehicles([]);
                  }}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-md"
                >
                  + Add More Vehicle
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vehicles;


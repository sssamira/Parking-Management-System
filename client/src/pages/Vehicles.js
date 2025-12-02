import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Vehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    licensePlate: '',
    carType: '',
    carModel: '',
    carColor: '',
    carYear: '',
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, formData);
      } else {
        await api.post('/vehicles', formData);
      }
      setShowAddForm(false);
      setEditingVehicle(null);
      setFormData({
        licensePlate: '',
        carType: '',
        carModel: '',
        carColor: '',
        carYear: '',
      });
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
    setEditingVehicle(null);
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
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingVehicle(null);
                setFormData({
                  licensePlate: '',
                  carType: '',
                  carModel: '',
                  carColor: '',
                  carYear: '',
                });
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {showAddForm ? 'Cancel' : '+ Add Vehicle'}
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {showAddForm && (
            <div className="mb-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
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
                onClick={() => setShowAddForm(true)}
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
                    setShowAddForm(true);
                    setEditingVehicle(null);
                    setFormData({
                      licensePlate: '',
                      carType: '',
                      carModel: '',
                      carColor: '',
                      carYear: '',
                    });
                    // Scroll to form if it's already visible
                    setTimeout(() => {
                      const formElement = document.querySelector('.bg-gray-50');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
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


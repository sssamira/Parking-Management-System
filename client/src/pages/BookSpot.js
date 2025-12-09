import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const BookSpot = () => {
  const navigate = useNavigate();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  
  // Search filters
  const [filters, setFilters] = useState({
    location: '',
    vehicleType: '',
    date: '',
    startTime: '',
    endTime: '',
    carModel: '',
    driverName: '',
    licenseNumber: '',
  });

  // Booking form
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [bookingData, setBookingData] = useState({
    parkingSpotId: '',
    startTime: '',
    endTime: '',
    vehicle: {
      licensePlate: '',
      carType: ''
    }
  });

  useEffect(() => {
    // Get user data
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setVehicles(userData.vehicles || []);
        if (userData.vehicles && userData.vehicles.length > 0) {
          setBookingData(prev => ({
            ...prev,
            vehicle: {
              licensePlate: userData.vehicles[0].licensePlate || '',
              carType: userData.vehicles[0].carType || ''
            }
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleBookingChange = (e) => {
    if (e.target.name === 'licensePlate' || e.target.name === 'carType') {
      setBookingData({
        ...bookingData,
        vehicle: {
          ...bookingData.vehicle,
          [e.target.name]: e.target.value,
        },
      });
    } else {
      setBookingData({
        ...bookingData,
        [e.target.name]: e.target.value,
      });
    }
  };

  const searchSpots = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setSelectedSpot(null);

    try {
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.vehicleType) params.append('vehicleType', filters.vehicleType);
      if (filters.startTime) params.append('startTime', new Date(filters.startTime).toISOString());
      if (filters.endTime) params.append('endTime', new Date(filters.endTime).toISOString());

      const response = await api.get(`/parking?${params.toString()}`);
      setSpots(response.data.availableSpots || response.data.spots || []);
      
      if ((response.data.availableSpots || response.data.spots || []).length === 0) {
        setError('No available spots found for your criteria. Try adjusting your search filters.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search for spots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpot = (spot) => {
    setSelectedSpot(spot);
    setBookingData({
      ...bookingData,
      parkingSpotId: spot._id,
    });
    setError('');
  };

  const handleBookSpot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!bookingData.parkingSpotId) {
      setError('Please select a parking spot');
      setLoading(false);
      return;
    }
    if (!bookingData.startTime || !bookingData.endTime) {
      setError('Please select both start and end time');
      setLoading(false);
      return;
    }
    if (new Date(bookingData.startTime) >= new Date(bookingData.endTime)) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }
    if (new Date(bookingData.startTime) < new Date()) {
      setError('Start time cannot be in the past');
      setLoading(false);
      return;
    }
    if (!bookingData.vehicle.licensePlate) {
      setError('Please select or enter a vehicle license plate');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/bookings', {
        parkingSpotId: bookingData.parkingSpotId,
        startTime: new Date(bookingData.startTime).toISOString(),
        endTime: new Date(bookingData.endTime).toISOString(),
        vehicle: bookingData.vehicle,
      });

      setSuccess(`Booking confirmed! Your booking ID is ${response.data.booking._id}. A confirmation email has been sent to ${user?.email || 'your email'}.`);
      setSelectedSpot(null);
      setBookingData({
        parkingSpotId: '',
        startTime: '',
        endTime: '',
        vehicle: {
          licensePlate: vehicles.length > 0 ? vehicles[0].licensePlate : '',
          carType: vehicles.length > 0 ? vehicles[0].carType : ''
        }
      });
      
      // Refresh spots to show updated availability
      setTimeout(() => {
        searchSpots();
      }, 2000);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.message || 'Failed to book spot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-indigo-900">Spot Pre-Booking</h1>
          <p className="text-gray-600 mt-2">Reserve a parking spot for your preferred date and time</p>
        </div>

        {/* Messages */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-indigo-900 mb-4">Search Filters</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Locations</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    name="vehicleType"
                    value={filters.vehicleType}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="All">All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Car Model
                  </label>
                  <input
                    type="text"
                    name="carModel"
                    value={filters.carModel}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Toyota Corolla"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={filters.driverName}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter driver name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={filters.licenseNumber}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter license number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={filters.date}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={filters.startTime}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={filters.endTime}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={searchSpots}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? 'Searching...' : 'Search Spots'}
                </button>
              </div>
            </div>
          </div>

          {/* Available Spots */}
          <div className="lg:col-span-2">
            {selectedSpot ? (
              /* Booking Form */
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-indigo-900 mb-4">Complete Your Booking</h2>
                
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600">Selected Spot:</p>
                  <p className="font-semibold text-indigo-900">
                    {selectedSpot.spotNum} - {selectedSpot.parkinglotName} (Floor {selectedSpot.floor})
                  </p>
                  <p className="text-sm text-gray-600">Location: {selectedSpot.location}</p>
                  <p className="text-sm text-gray-600">Price: ${selectedSpot.pricePerHour}/hour</p>
                </div>

                <form onSubmit={handleBookSpot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={bookingData.startTime}
                      onChange={handleBookingChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={bookingData.endTime}
                      onChange={handleBookingChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle License Plate *
                    </label>
                    {vehicles.length > 0 ? (
                      <select
                        name="licensePlate"
                        value={bookingData.vehicle.licensePlate}
                        onChange={handleBookingChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map((vehicle, index) => (
                          <option key={index} value={vehicle.licensePlate}>
                            {vehicle.licensePlate} - {vehicle.carType} {vehicle.carModel}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="licensePlate"
                        value={bookingData.vehicle.licensePlate}
                        onChange={handleBookingChange}
                        required
                        placeholder="Enter license plate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type *
                    </label>
                    <select
                      name="carType"
                      value={bookingData.vehicle.carType}
                      onChange={handleBookingChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Type</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Convertible">Convertible</option>
                      <option value="Truck">Truck</option>
                      <option value="Van">Van</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setSelectedSpot(null)}
                      className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {loading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Spots List */
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-indigo-900 mb-4">
                  Available Spots
                </h2>
                
                {spots.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No spots available. Use the search filters to find parking spots.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {spots.map((spot) => (
                      <div
                        key={spot._id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-indigo-900">
                              Spot {spot.spotNum} - {spot.parkinglotName}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Floor {spot.floor} • {spot.location}
                            </p>
                            <p className="text-sm text-gray-600">
                              Vehicle Type: {spot.vehicleType} • ${spot.pricePerHour}/hour
                            </p>
                            {spot.tags && spot.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {spot.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSelectSpot(spot)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSpot;


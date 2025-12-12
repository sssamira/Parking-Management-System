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
  const [locationPrice, setLocationPrice] = useState(null); // Store price info for selected parking lot name
  const [loadingPrice, setLoadingPrice] = useState(false); // Loading state for price fetch

  // Search filters
  const [filters, setFilters] = useState({
    parkingLotName: '',
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

  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });

    // If parking lot name changed, fetch price for that parking lot
    if (name === 'parkingLotName' && value) {
      // Show loading state immediately
      setLoadingPrice(true);
      setLocationPrice({
        location: value,
        loading: true
      });

      try {
        const response = await api.get(`/parking?parkingLotName=${encodeURIComponent(value)}`);

        // Check both availableSpots and spots in response
        const spots = response.data?.availableSpots || response.data?.spots || [];

        if (spots.length > 0) {
          // Calculate average price
          const prices = spots.map(spot => spot.pricePerHour || 0).filter(p => p > 0);

          if (prices.length > 0) {
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            setLocationPrice({
              location: value,
              average: avgPrice.toFixed(2),
              min: minPrice,
              max: maxPrice,
              hasRange: minPrice !== maxPrice,
              loading: false
            });
          } else {
            setLocationPrice({
              location: value,
              average: 'N/A',
              min: 0,
              max: 0,
              hasRange: false,
              noPrice: true,
              loading: false
            });
          }
        } else {
          // Show message even if no spots found
          setLocationPrice({
            location: value,
            average: 'N/A',
            min: 0,
            max: 0,
            hasRange: false,
            noSpots: true,
            loading: false
          });
        }
      } catch (err) {
        console.error('Error fetching location price:', err);
        setLocationPrice({
          location: value,
          average: 'N/A',
          min: 0,
          max: 0,
          hasRange: false,
          error: true,
          loading: false
        });
      } finally {
        setLoadingPrice(false);
      }
    } else if (name === 'parkingLotName' && !value) {
      // Parking lot name cleared
      setLocationPrice(null);
      setLoadingPrice(false);
    }
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

    // Validation
    if (!filters.parkingLotName) {
      setError('Please select a parking lot name to search for spots.');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.parkingLotName) params.append('parkingLotName', filters.parkingLotName);
      if (filters.vehicleType) params.append('vehicleType', filters.vehicleType);

      // Only include time filters if both are provided for availability checking
      if (filters.startTime && filters.endTime) {
        params.append('startTime', new Date(filters.startTime).toISOString());
        params.append('endTime', new Date(filters.endTime).toISOString());
      }

      const response = await api.get(`/parking?${params.toString()}`);
      const availableSpots = response.data.availableSpots || response.data.spots || [];
      setSpots(availableSpots);

      if (availableSpots.length === 0) {
        if (filters.startTime && filters.endTime) {
          setError('No available spots found for your selected parking lot and time. Try adjusting your search filters or time range.');
        } else {
          setError('No spots found for this parking lot. Try selecting a different parking lot or add time filters to check availability.');
        }
      } else {
        setSuccess(`✅ Found ${availableSpots.length} ${availableSpots.length === 1 ? 'available spot' : 'available spots'}!`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search for spots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitSearchDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first to save search details.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await api.post('/search-queries', {
        parkingLotName: filters.parkingLotName,
        vehicleType: filters.vehicleType,
        date: filters.date,
        startTime: filters.startTime,
        endTime: filters.endTime,
        carModel: filters.carModel,
        driverName: filters.driverName,
        licenseNumber: filters.licenseNumber,
      });

      setSuccess('✅ Your search details have been successfully submitted and saved to the database! The admin will review your requirements.');

      // Optionally reset form after successful submission
      // Uncomment the following lines if you want to clear the form after submission
      // setFilters({
      //   location: '',
      //   vehicleType: '',
      //   date: '',
      //   startTime: '',
      //   endTime: '',
      //   carModel: '',
      //   driverName: '',
      //   licenseNumber: '',
      // });
    } catch (err) {
      console.error('Submit error:', err);

      // Don't redirect to login if it's a 401 - let the user see the error
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Navigate to login after showing error
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Failed to save search details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpot = (spot) => {
    setSelectedSpot(spot);
    setBookingData({
      ...bookingData,
      parkingSpotId: spot._id,
      // Pre-populate times from filters if available
      startTime: filters.startTime || bookingData.startTime,
      endTime: filters.endTime || bookingData.endTime,
    });
    setError('');
  };

  const handlePaymentClick = () => {
    try {
      const start = bookingData.startTime || filters.startTime;
      const end = bookingData.endTime || filters.endTime;
      const spot = selectedSpot;
      if (!spot || !start || !end) {
        window.location.href = '/paymentPage.html';
        return;
      }
      const startDate = new Date(start);
      const endDate = new Date(end);
      const durationMs = endDate.getTime() - startDate.getTime();
      if (durationMs <= 0) {
        return;
      }
      const durationHours = Math.max(durationMs / (1000 * 60 * 60), 0.5);
      const price = Number((durationHours * (spot.pricePerHour || 0)).toFixed(2));
      const amountMinor = Math.round(price * 100);
      const displayAmount = price.toFixed(2);
      window.location.href = `/paymentPage.html?amount=${amountMinor}&displayAmount=${encodeURIComponent(displayAmount)}`;
    } catch (e) {
      window.location.href = '/paymentPage.html';
    }
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
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first to book a spot');
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      console.log('📝 Submitting booking:', {
        parkingSpotId: bookingData.parkingSpotId,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        vehicle: bookingData.vehicle
      });

      const response = await api.post('/bookings', {
        parkingSpotId: bookingData.parkingSpotId,
        startTime: new Date(bookingData.startTime).toISOString(),
        endTime: new Date(bookingData.endTime).toISOString(),
        vehicle: bookingData.vehicle,
      });

      console.log('✅ Booking response:', response.data);

      if (response.data && response.data.booking) {
        const bookingStatus = response.data.booking.status;
        if (bookingStatus === 'pending') {
          setSuccess(`✅ Booking request submitted! Your booking ID is ${response.data.booking._id}. Your request is pending admin approval. You will receive an email notification once it's approved or rejected.`);
        } else {
          setSuccess(`✅ Booking confirmed! Your booking ID is ${response.data.booking._id}. A confirmation email has been sent to ${user?.email || 'your email'}.`);
        }
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
      } else {
        setError('Booking created but no confirmation received. Please check your bookings.');
      }
    } catch (err) {
      console.error('❌ Booking error:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);

      if (err.response?.status === 401) {
        setError('Please login to book a spot');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 409) {
        setError('❌ This spot is not available for the selected time. It is already booked. Please select a different spot or time.');
        setSelectedSpot(null);
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Invalid booking data. Please check your inputs.');
      } else {
        setError(err.response?.data?.message || 'Failed to book spot. Please try again.');
      }
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

        <div className="grid grid-cols-1 gap-6">
          {/* Search Filters Form */}
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-indigo-900 mb-4">Search & Submit Form</h2>
              <p className="text-sm text-gray-600 mb-4">Fill in the details below to search for spots or submit your requirements to the admin.</p>

              <form onSubmit={submitSearchDetails} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parking Lot Name
                  </label>
                  <select
                    name="parkingLotName"
                    value={filters.parkingLotName}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Parking Lots</option>
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
                  {/* Display hourly payment info when location is selected */}
                  {locationPrice && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {locationPrice.loading ? (
                        <p className="text-sm text-blue-800 font-medium">
                          ⏳ Loading price for <span className="font-semibold">{locationPrice.location}</span>...
                        </p>
                      ) : locationPrice.noSpots ? (
                        <p className="text-sm text-blue-800 font-medium">
                          ℹ️ No parking spots found for <span className="font-semibold">{locationPrice.location}</span>. Please contact admin to add spots.
                        </p>
                      ) : locationPrice.error ? (
                        <p className="text-sm text-blue-800 font-medium">
                          ⚠️ Unable to fetch price for <span className="font-semibold">{locationPrice.location}</span>. Please try again.
                        </p>
                      ) : locationPrice.noPrice ? (
                        <p className="text-sm text-blue-800 font-medium">
                          ℹ️ Price information not available for <span className="font-semibold">{locationPrice.location}</span> parking.
                        </p>
                      ) : (
                        <p className="text-sm text-blue-800 font-medium">
                          💰 Hourly payment is ৳{locationPrice.hasRange
                            ? `${locationPrice.min} - ৳${locationPrice.max}`
                            : locationPrice.average} for <span className="font-semibold">{locationPrice.location}</span> parking
                        </p>
                      )}
                    </div>
                  )}
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
                  type="button"
                  onClick={handlePaymentClick}
                  className="w-full py-2 px-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-semibold"
                >
                  Payment
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </form>
            </div>

            {/* Booking Form - Shows when spot is selected */}
            {selectedSpot && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                <h2 className="text-xl font-semibold text-indigo-900 mb-4">Complete Your Booking</h2>

                <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600">Selected Spot:</p>
                  <p className="font-semibold text-indigo-900">
                    {selectedSpot.spotNum} - {selectedSpot.area} (Floor {selectedSpot.floor})
                  </p>
                  <p className="text-sm text-gray-600">Parking Lot Name: {selectedSpot.parkingLotName}</p>
                  <p className="text-sm text-gray-600">Price: ৳{selectedSpot.pricePerHour}/hour</p>
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
            )}

            {/* Display search results inline when spots are found */}
            {spots.length > 0 && !selectedSpot && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-indigo-900">
                    Available Spots Found
                  </h2>
                  <span className="text-sm text-gray-600 bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {spots.length} {spots.length === 1 ? 'spot' : 'spots'} available
                  </span>
                </div>

                <div className="space-y-4">
                  {spots.map((spot) => (
                    <div
                      key={spot._id}
                      className="border-2 border-green-200 bg-green-50 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-indigo-900">
                              Spot {spot.spotNum} - {spot.area}
                            </h3>
                            <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-semibold">
                              ✓ Available
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Floor {spot.floor} • {spot.parkingLotName}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vehicle Type: {spot.vehicleType} • ৳{spot.pricePerHour}/hour
                          </p>
                          {filters.startTime && filters.endTime && (
                            <p className="text-xs text-green-700 mt-2 font-medium">
                              ✓ Available for your selected time: {new Date(filters.startTime).toLocaleString()} - {new Date(filters.endTime).toLocaleString()}
                            </p>
                          )}
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
                          className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold whitespace-nowrap"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSpot;


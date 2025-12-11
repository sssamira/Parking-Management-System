import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AllSpots = () => {
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
        minPrice: '',
        maxPrice: '',
        startTime: '',
        endTime: '',
    });

    // Booking form state
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

            // Initial load of all spots
            fetchAllSpots();
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }, []);

    const fetchAllSpots = async () => {
        setLoading(true);
        try {
            const response = await api.get('/parking');
            const allSpots = response.data.availableSpots || response.data.spots || [];
            setSpots(allSpots);
        } catch (err) {
            console.error('Error fetching spots:', err);
            setError('Failed to load parking spots.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filters.location) params.append('location', filters.location);
            if (filters.vehicleType) params.append('vehicleType', filters.vehicleType);
            if (filters.minPrice) params.append('minPrice', filters.minPrice);
            if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

            if (filters.startTime && filters.endTime) {
                params.append('startTime', new Date(filters.startTime).toISOString());
                params.append('endTime', new Date(filters.endTime).toISOString());
            }

            const response = await api.get(`/parking?${params.toString()}`);
            const results = response.data.availableSpots || response.data.spots || [];
            setSpots(results);

            if (results.length === 0) {
                setError('No spots found matching your criteria.');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search spots.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSpot = (spot) => {
        if (!localStorage.getItem('token')) {
            setError('Please login to book a spot');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }
        setSelectedSpot(spot);
        setBookingData({
            ...bookingData,
            parkingSpotId: spot._id,
            startTime: filters.startTime || bookingData.startTime,
            endTime: filters.endTime || bookingData.endTime,
        });
        setError('');
        setSuccess('');
        // Scroll to booking form
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handleBookSpot = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (!bookingData.startTime || !bookingData.endTime) {
            setError('Please select start and end time');
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

            if (response.data && response.data.booking) {
                setSuccess('✅ Booking successful! Check your email for confirmation.');
                setSelectedSpot(null);
                // Refresh list
                handleSearch(e);
            }
        } catch (err) {
            console.error('Booking error:', err);
            setError(err.response?.data?.message || 'Failed to book spot.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-indigo-900">Find Parking Spots</h1>
                        <p className="text-gray-600 mt-2">Browse and filter available parking spots</p>
                    </div>
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Back to Home</Link>
                </div>

                {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                {success && <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm sticky top-8">
                            <h2 className="text-lg font-semibold mb-4">Filter Spots</h2>
                            <form onSubmit={handleSearch} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={filters.location}
                                        onChange={handleFilterChange}
                                        placeholder="e.g. Bashundhara"
                                        className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                    <select
                                        name="vehicleType"
                                        value={filters.vehicleType}
                                        onChange={handleFilterChange}
                                        className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All Types</option>
                                        <option value="Car">Car</option>
                                        <option value="Bike">Bike</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                                        <input
                                            type="number"
                                            name="minPrice"
                                            value={filters.minPrice}
                                            onChange={handleFilterChange}
                                            placeholder="0"
                                            className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                                        <input
                                            type="number"
                                            name="maxPrice"
                                            value={filters.maxPrice}
                                            onChange={handleFilterChange}
                                            placeholder="1000"
                                            className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        name="startTime"
                                        value={filters.startTime}
                                        onChange={handleFilterChange}
                                        className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input
                                        type="datetime-local"
                                        name="endTime"
                                        value={filters.endTime}
                                        onChange={handleFilterChange}
                                        className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                                    {loading ? 'Searching...' : 'Search Check'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results & Booking */}
                    <div className="lg:col-span-3">
                        {/* Booking Modal / Area */}
                        {selectedSpot && (
                            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-2 border-indigo-100">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-indigo-900">Book Spot: {selectedSpot.spotNum}</h3>
                                    <button onClick={() => setSelectedSpot(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                                    <p><strong>Location:</strong> {selectedSpot.location} ({selectedSpot.parkinglotName})</p>
                                    <p><strong>Price:</strong> ৳{selectedSpot.pricePerHour}/hr</p>
                                </div>

                                <form onSubmit={handleBookSpot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            name="startTime"
                                            value={bookingData.startTime}
                                            onChange={handleBookingChange}
                                            required
                                            className="w-full border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <input
                                            type="datetime-local"
                                            name="endTime"
                                            value={bookingData.endTime}
                                            onChange={handleBookingChange}
                                            required
                                            className="w-full border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                        {vehicles.length > 0 ? (
                                            <select
                                                name="licensePlate"
                                                value={bookingData.vehicle.licensePlate}
                                                onChange={handleBookingChange}
                                                required
                                                className="w-full border-gray-300 rounded-lg"
                                            >
                                                <option value="">Select Vehicle</option>
                                                {vehicles.map((v, i) => (
                                                    <option key={i} value={v.licensePlate}>{v.licensePlate}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                name="licensePlate"
                                                value={bookingData.vehicle.licensePlate}
                                                onChange={handleBookingChange}
                                                placeholder="License Plate"
                                                required
                                                className="w-full border-gray-300 rounded-lg"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                        <select
                                            name="carType"
                                            value={bookingData.vehicle.carType}
                                            onChange={handleBookingChange}
                                            required
                                            className="w-full border-gray-300 rounded-lg"
                                        >
                                            <option value="">Select Type</option>
                                            {['Sedan', 'SUV', 'Bike', 'Truck'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg shadow-md">
                                            {loading ? 'Processing...' : 'Confirm Booking'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Spots Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {spots.map(spot => (
                                <div key={spot._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">{spot.parkinglotName}</h3>
                                            <p className="text-gray-500 text-sm">{spot.location}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{spot.vehicleType}</span>
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">৳{spot.pricePerHour}/hr</span>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Floor {spot.floor}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-indigo-600">#{spot.spotNum}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSelectSpot(spot)}
                                        className="w-full mt-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-semibold text-sm"
                                    >
                                        Book This Spot
                                    </button>
                                </div>
                            ))}
                        </div>
                        {spots.length === 0 && !loading && (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-xl">No parking spots found matching your criteria.</p>
                                <p className="mt-2">Try adjusting your filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllSpots;

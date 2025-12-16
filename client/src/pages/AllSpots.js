import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const formatDateTimeLocal = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

// Helper function to get current date/time in datetime-local format
const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to check if a datetime-local value is for today
const isToday = (dateTimeLocal) => {
    if (!dateTimeLocal) return false;
    const selectedDate = new Date(dateTimeLocal);
    const today = new Date();
    return (
        selectedDate.getFullYear() === today.getFullYear() &&
        selectedDate.getMonth() === today.getMonth() &&
        selectedDate.getDate() === today.getDate()
    );
};

// Helper function to get min datetime for startTime
// If the selected date is today, use current time; otherwise use start of selected day
const getMinStartTime = (selectedDateTime) => {
    const now = new Date();
    const currentDateTimeLocal = getCurrentDateTimeLocal();
    
    // Always default to current time if no selection
    if (!selectedDateTime) {
        return currentDateTimeLocal;
    }
    
    try {
        const selectedDate = new Date(selectedDateTime);
        const today = new Date();
        
        // Reset time parts for date-only comparison
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // If selected date is today, use current time (prevents past hours)
        if (selectedDateOnly.getTime() === todayOnly.getTime()) {
            return currentDateTimeLocal;
        }
        
        // If selected date is in the future, use start of that day
        if (selectedDateOnly > todayOnly) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}T00:00`;
        }
        
        // If somehow in the past, use current time
        return currentDateTimeLocal;
    } catch (e) {
        // If parsing fails, use current time
        return currentDateTimeLocal;
    }
};

// Helper function to get min datetime for endTime
const getMinEndTime = (startTime) => {
    if (!startTime) {
        return getCurrentDateTimeLocal();
    }
    
    const now = new Date();
    const startDate = new Date(startTime);
    const currentDateTimeLocal = getCurrentDateTimeLocal();
    
    // If startTime is today and in the past, use current time
    if (isToday(startTime) && startDate < now) {
        return currentDateTimeLocal;
    }
    
    // Otherwise, use the startTime (or current time if startTime is in the past)
    return startDate > now ? startTime : currentDateTimeLocal;
};

const AllSpots = () => {
    const navigate = useNavigate();
    const [spots, setSpots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [parkingLots, setParkingLots] = useState([]);
    const [parkingLotSearch, setParkingLotSearch] = useState('');
    const [activeParkingLot, setActiveParkingLot] = useState('');
    const [activeLotLocation, setActiveLotLocation] = useState('');
    const resultsRef = useRef(null);

    // Search filters
    const [filters, setFilters] = useState({
        parkingLotName: '',
        location: '',
        vehicleType: '',
        minPrice: '',
        maxPrice: '',
        startTime: '',
        endTime: '',
    });

    const activeLocationLabel = activeLotLocation || 'Unspecified location';

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
            fetchParkingLots();
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }, []);

    const fetchParkingLots = async () => {
        try {
            const response = await api.get('/parking/lots');
            setParkingLots(response.data?.lots || []);
        } catch (err) {
            console.error('Error fetching parking lot summary:', err);
        }
    };

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
        
        // Validate datetime inputs to prevent past times for today
        let validatedValue = value;
        if ((name === 'startTime' || name === 'endTime') && value) {
            const selectedDate = new Date(value);
            const now = new Date();
            
            // If selected date/time is today and in the past, adjust to current time
            if (isToday(value) && selectedDate < now) {
                validatedValue = getCurrentDateTimeLocal();
            }
        }
        
        setFilters({
            ...filters,
            [name]: validatedValue,
        });
    };

    const runSearch = async (activeFilters) => {
        setLoading(true);
        setError('');
        setSuccess('');
        setSelectedSpot(null);

        try {
            const params = new URLSearchParams();
            if (activeFilters.parkingLotName) params.append('parkingLotName', activeFilters.parkingLotName);
            if (activeFilters.location) params.append('location', activeFilters.location);
            if (activeFilters.vehicleType) params.append('vehicleType', activeFilters.vehicleType);
            if (activeFilters.minPrice) params.append('minPrice', activeFilters.minPrice);
            if (activeFilters.maxPrice) params.append('maxPrice', activeFilters.maxPrice);

            if (activeFilters.startTime && activeFilters.endTime) {
                params.append('startTime', new Date(activeFilters.startTime).toISOString());
                params.append('endTime', new Date(activeFilters.endTime).toISOString());
            }

            const response = await api.get(`/parking?${params.toString()}`);
            const results = response.data.availableSpots || response.data.spots || [];
            setSpots(results);

            if (results.length === 0) {
                setError('No spots found matching your criteria.');
            } else {
                setError('');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search spots.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        await runSearch(filters);
    };

    const handleParkingLotSelect = async (lot) => {
        const locationFilter = lot.location || '';
        const updatedFilters = {
            ...filters,
            parkingLotName: lot.parkingLotName,
            location: locationFilter,
        };
        setActiveParkingLot(lot.parkingLotName);
        setActiveLotLocation(locationFilter);
        setFilters(updatedFilters);
        setSelectedSpot(null);
        setError('');
        setSuccess('');
        await runSearch(updatedFilters);
        if (resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleClearParkingLot = async () => {
        if (!activeParkingLot) {
            return;
        }
        const updatedFilters = {
            ...filters,
            parkingLotName: '',
            location: '',
        };
        setActiveParkingLot('');
        setActiveLotLocation('');
        setFilters(updatedFilters);
        setSelectedSpot(null);
        setError('');
        setSuccess('');
        await runSearch(updatedFilters);
        if (resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Use helper functions for dynamic min values
    const minStartTime = getMinStartTime(bookingData.startTime);
    const minEndTime = getMinEndTime(bookingData.startTime);

    const filteredParkingLots = parkingLots.filter((lot) => {
        const keyword = parkingLotSearch.trim().toLowerCase();
        if (!keyword) {
            return true;
        }

        const locationValue = (lot.location || '').toLowerCase();
        const matchesLocation = locationValue.includes(keyword);

        const matchesName = (lot.parkingLotName || '').toLowerCase().includes(keyword);

        return matchesLocation || matchesName;
    });

    const handleSelectSpot = (spot) => {
        if (!localStorage.getItem('token')) {
            setError('Please login to book a spot');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }
        setSelectedSpot(spot);
        setBookingData((prev) => ({
            ...prev,
            parkingSpotId: spot._id,
            startTime: filters.startTime || prev.startTime,
            endTime: filters.endTime || prev.endTime,
        }));
        setError('');
        setSuccess('');
    };

    const handleBookingChange = (e) => {
        const { name, value } = e.target;
        
        // Validate datetime inputs to prevent past times for today
        let validatedValue = value;
        if ((name === 'startTime' || name === 'endTime') && value) {
            const selectedDate = new Date(value);
            const now = new Date();
            
            // If selected date/time is today and in the past, adjust to current time
            if (isToday(value) && selectedDate < now) {
                validatedValue = getCurrentDateTimeLocal();
                // Show a brief message to user
                setError('Selected time was in the past. Adjusted to current time.');
                setTimeout(() => setError(''), 3000);
            }
        }

        if (name === 'licensePlate' || name === 'carType') {
            setBookingData((prev) => ({
                ...prev,
                vehicle: {
                    ...prev.vehicle,
                    [name]: validatedValue,
                },
            }));
        } else if (name === 'startTime') {
            setBookingData((prev) => {
                const updated = {
                    ...prev,
                    startTime: validatedValue,
                };
                // Reset endTime if it's now invalid
                if (prev.endTime && prev.endTime <= validatedValue) {
                    updated.endTime = '';
                }
                return updated;
            });
        } else if (name === 'endTime') {
            setBookingData((prev) => ({
                ...prev,
                endTime: validatedValue,
            }));
        } else {
            setBookingData((prev) => ({
                ...prev,
                [name]: validatedValue,
            }));
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

        const startDate = new Date(bookingData.startTime);
        const endDate = new Date(bookingData.endTime);
        const now = new Date();

        if (Number.isNaN(startDate.getTime()) || startDate < now) {
            setError('Start time must be in the future');
            setLoading(false);
            return;
        }

        if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            setError('End time must be after the start time');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/bookings', {
                parkingSpotId: bookingData.parkingSpotId,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                vehicle: bookingData.vehicle,
            });

            if (response.data && response.data.booking) {
                setSuccess('✅ Booking successful! Check your email for confirmation.');
                setSelectedSpot(null);
                // Refresh list
                setTimeout(() => {
                    runSearch(filters);
                }, 0);
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

                {parkingLots.length > 0 && (
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-indigo-900">Available Parking Lots</h2>
                                <p className="text-gray-600 mt-1">Select a parking lot to quickly view its available spots.</p>
                            </div>
                            <p className="text-sm text-gray-500">Showing {filteredParkingLots.length} of {parkingLots.length} parking lot{parkingLots.length === 1 ? '' : 's'}</p>
                        </div>
                        <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
                            <input
                                type="text"
                                value={parkingLotSearch}
                                onChange={(e) => setParkingLotSearch(e.target.value)}
                                placeholder="Search by parking lot name or area keyword (e.g., Gulshan, Dhanmondi)"
                                className="w-full md:w-96 px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0">
                                {parkingLotSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setParkingLotSearch('')}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        Clear search
                                    </button>
                                )}
                                {activeParkingLot && (
                                    <button
                                        type="button"
                                        onClick={handleClearParkingLot}
                                        className="text-sm text-rose-600 hover:text-rose-800"
                                    >
                                        Clear selected parking lot
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeParkingLot && (
                            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-sm flex items-center justify-between gap-3">
                                <span>Selected parking lot: <strong>{activeParkingLot} - {activeLocationLabel}</strong></span>
                                <button
                                    type="button"
                                    onClick={handleClearParkingLot}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {parkingLotSearch && filteredParkingLots.length === 0 && (
                            <p className="mt-4 text-sm text-gray-500">No parking lots found for "{parkingLotSearch}".</p>
                        )}

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredParkingLots.map((lot) => {
                                const locationLabel = lot.location || 'Unspecified location';
                                const lotKey = `${lot.parkingLotName || 'Unknown'}__${locationLabel}`;
                                const isActive = activeParkingLot === lot.parkingLotName && activeLotLocation === lot.location;
                                return (
                                    <button
                                        key={lotKey}
                                        type="button"
                                        onClick={() => handleParkingLotSelect(lot)}
                                        className={`text-left bg-white p-5 rounded-xl shadow-sm border ${isActive ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200' : 'border-indigo-100'} hover:border-indigo-300 hover:shadow-md transition`}
                                        aria-pressed={isActive}
                                    >
                                        <h3 className="text-lg font-semibold text-indigo-900">{lot.parkingLotName}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{lot.totalSpots} spot{lot.totalSpots === 1 ? '' : 's'} available</p>
                                        <p className="text-xs text-gray-500 mt-2">{locationLabel}</p>
                                        {lot.vehicleTypes && lot.vehicleTypes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {lot.vehicleTypes.map((type) => (
                                                    <span key={type} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm sticky top-8">
                            <h2 className="text-lg font-semibold mb-4">Filter Spots</h2>
                            <form onSubmit={handleSearch} className="space-y-4">
                                {activeParkingLot && (
                                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 flex items-center justify-between gap-3">
                                        <span>
                                            Filtering by: <strong>{activeParkingLot} - {activeLocationLabel}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleClearParkingLot}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
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
                                        onBlur={(e) => {
                                            // Validate on blur as backup
                                            if (e.target.value && isToday(e.target.value)) {
                                                const selectedDate = new Date(e.target.value);
                                                const now = new Date();
                                                if (selectedDate < now) {
                                                    const corrected = getCurrentDateTimeLocal();
                                                    setFilters(prev => ({ ...prev, startTime: corrected }));
                                                }
                                            }
                                        }}
                                        min={getMinStartTime(filters.startTime)}
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
                                        onBlur={(e) => {
                                            // Validate on blur as backup
                                            if (e.target.value && isToday(e.target.value)) {
                                                const selectedDate = new Date(e.target.value);
                                                const now = new Date();
                                                if (selectedDate < now) {
                                                    const corrected = getCurrentDateTimeLocal();
                                                    setFilters(prev => ({ ...prev, endTime: corrected }));
                                                }
                                            }
                                        }}
                                        min={getMinEndTime(filters.startTime)}
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
                    <div className="lg:col-span-3" ref={resultsRef}>
                        {/* Floating Booking Modal */}
                        {selectedSpot && (
                            <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                                <div
                                    className="absolute inset-0 bg-black bg-opacity-40"
                                    onClick={() => setSelectedSpot(null)}
                                ></div>
                                <div className="relative z-50 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-indigo-100">
                                    <div className="flex justify-between items-start p-6 border-b border-indigo-50">
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">Booking Spot</p>
                                            <h3 className="text-2xl font-bold text-indigo-900 mt-1">Spot #{selectedSpot.spotNum}</h3>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSpot(null)}
                                            className="text-gray-400 hover:text-gray-600 transition"
                                            aria-label="Close booking form"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="px-6 pt-4 pb-2 bg-indigo-50/70 text-sm text-indigo-900">
                                        <p><strong>Parking Lot:</strong> {selectedSpot.parkingLotName || selectedSpot.parkinglotName || 'N/A'}</p>
                                        <p><strong>Area:</strong> {selectedSpot.location || 'N/A'}</p>
                                        <p><strong>Price:</strong> ৳{selectedSpot.computedPricePerHour ?? selectedSpot.pricePerHour}/hr</p>
                                        {selectedSpot.surgeApplied && (
                                            <p className="text-xs text-rose-700 font-medium">Rush hour pricing applied (+{selectedSpot.surgePercent}%)</p>
                                        )}
                                    </div>
                                    <form onSubmit={handleBookSpot} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input
                                                type="datetime-local"
                                                name="startTime"
                                                value={bookingData.startTime}
                                                onChange={handleBookingChange}
                                                required
                                                min={minStartTime}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                                min={minEndTime}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">Select Type</option>
                                                {['Sedan', 'SUV', 'Bike', 'Truck'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 justify-end pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSpot(null)}
                                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 sm:flex-none px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-60"
                                            >
                                                {loading ? 'Processing...' : 'Confirm Booking'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Spots Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {spots.map(spot => (
                                <div key={spot._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">{spot.parkingLotName || spot.parkinglotName || 'Unnamed Parking Lot'}</h3>
                                            <p className="text-gray-500 text-sm">Area: {spot.location || 'N/A'}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{spot.vehicleType}</span>
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">৳{(spot.computedPricePerHour ?? spot.pricePerHour)}/hr</span>
                                                {spot.surgeApplied && (
                                                    <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs rounded-full">Rush +{spot.surgePercent}%</span>
                                                )}
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

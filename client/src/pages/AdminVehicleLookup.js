import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from '../utils/api'; // Import the Axios instance

const AdminVehicleLookup = () => {
  const [searchType, setSearchType] = useState("licensePlate");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      setError("Please enter a search value");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      // Use Axios instead of fetch
      const response = await api.post("/admin/vehicle/vehicle-lookup", {
        searchType,
        searchValue: searchValue.trim()
      });

      // Axios automatically parses JSON, no .json() needed
      const data = response.data;
      
      // No need to check response.ok, Axios throws for non-2xx
      setResults(data.data);
    } catch (err) {
      // Axios error handling
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Search failed";
      setError(errorMessage);
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Vehicle Details Lookup
          </h1>
          <p className="text-gray-600">
            Retrieve vehicle information when confirmation is lost
          </p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search By
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="licensePlate">License Plate</option>
                  <option value="email">Email Address</option>
                  <option value="phone">Phone Number</option>
                  <option value="bookingId">Booking ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Value
                </label>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Enter search value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {loading ? "Searching..." : "Search Vehicle"}
            </button>
          </form>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            {results.map((result, index) => (
              <div key={index} className="mb-6 p-4 border rounded-lg">
                {result.user && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">{result.user.name}</h3>
                    <p>Email: {result.user.email}</p>
                    {result.user.phone && <p>Phone: {result.user.phone}</p>}
                  </div>
                )}
                {result.vehicle && (
                  <div className="mb-4">
                    <h4 className="font-semibold">Vehicle: {result.vehicle.licensePlate}</h4>
                    <p>Type: {result.vehicle.carType}</p>
                    <p>Color: {result.vehicle.carColor}</p>
                  </div>
                )}
                {result.vehicles && (
                  <div className="mb-4">
                    <h4 className="font-semibold">Vehicles ({result.vehicles.length})</h4>
                    {result.vehicles.map((vehicle, i) => (
                      <div key={i} className="text-sm border-t pt-2 mt-2">
                        {vehicle.licensePlate} - {vehicle.carType} ({vehicle.carColor})
                      </div>
                    ))}
                  </div>
                )}
                {result.bookings && result.bookings.length > 0 && (
                  <div>
                    <h4 className="font-semibold">Bookings ({result.bookings.length})</h4>
                    {result.bookings.map((booking, i) => (
                      <div key={i} className="text-sm border-t pt-2 mt-2">
                        {booking.parkingLotName} - {new Date(booking.startTime).toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVehicleLookup;
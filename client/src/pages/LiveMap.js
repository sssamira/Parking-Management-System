import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const LiveMap = () => {
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("map"); // "map" or "list"

  // Dhaka coordinates as default center
  const defaultCenter = [23.8103, 90.4125];
  const defaultZoom = 13;

  // Custom icons for parking lots
  const createIcon = (color) => {
    let iconColor = "blue";
    if (color === "orange") iconColor = "orange";
    else if (color === "green") iconColor = "green";
    else if (color === "red") iconColor = "red";
    
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  useEffect(() => {
    fetchParkingLots();
    // Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchParkingLots, 30000);
  
    return () => {
        clearInterval(intervalId); // Cleanup on unmount
    };

  }, []);

  const fetchParkingLots = async () => {
    try {
      const response = await fetch("/api/map/parking-lots");
      const data = await response.json();
      
      if (data.success) {
        setParkingLots(data.data);
      }
    } catch (error) {
      console.error("Error fetching parking lots:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (lot) => {
    if (lot.availableSpots === 0) return "Not Available";
    if (lot.type === 'paid') return "Paid Parking Available";
    if (lot.type === 'free') return "Free Parking Available";
    return "Available";
  };

  const getStatusClass = (lot) => {
    if (lot.availableSpots === 0) return "bg-red-100 text-red-800 border-red-300";
    if (lot.type === 'paid') return "bg-blue-100 text-blue-800 border-blue-300";
    if (lot.type === 'free') return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live parking map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Live Parking Map
              </h1>
              <p className="text-gray-600">
                Real-time availability of parking lots in Dhaka. Color-coded by availability.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded-md ${
                  viewMode === "map" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-md ${
                  viewMode === "list" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                List View
              </button>
              <Link
                to="/"
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Color Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm">Paid Parking Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-sm">Free Parking Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">General Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm">Not Available</span>
            </div>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="h-[600px] w-full">
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Parking lot markers */}
                {parkingLots.map((lot) => (
                  <Marker
                    key={lot.id}
                    position={[lot.latitude, lot.longitude]}
                    icon={createIcon(lot.color)}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-lg">{lot.name}</h3>
                        <p className="text-sm text-gray-600">{lot.address}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            <span className="font-semibold">Status:</span>{" "}
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(lot)}`}>
                              {getStatusText(lot)}
                            </span>
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">Available Spots:</span>{" "}
                            {lot.availableSpots}/{lot.totalSpots}
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">Price/Hour:</span>{" "}
                            ৳{lot.pricePerHour}
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">Type:</span>{" "}
                            <span className="capitalize">{lot.type}</span>
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map((lot) => (
              <div key={lot.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`p-6 border-l-4 ${
                  lot.color === 'blue' ? 'border-blue-500' :
                  lot.color === 'orange' ? 'border-orange-500' :
                  lot.color === 'green' ? 'border-green-500' : 'border-red-500'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-800">{lot.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{lot.address}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(lot)}`}>
                      {getStatusText(lot)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Available Spots</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {lot.availableSpots}<span className="text-sm text-gray-500">/{lot.totalSpots}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price/Hour</p>
                      <p className="text-2xl font-bold text-gray-800">৳{lot.pricePerHour}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold capitalize">{lot.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{lot.location}</p>
                    </div>
                  </div>
                  
                  {lot.amenities && lot.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-2">
                        {lot.amenities.map((amenity, index) => (
                          <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 mt-4">
                    <p>Coordinates: {lot.latitude.toFixed(4)}, {lot.longitude.toFixed(4)}</p>
                    <p className="mt-1">Open: {lot.openingHours.open} - {lot.openingHours.close}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchParkingLots}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh Parking Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
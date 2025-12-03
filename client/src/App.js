import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Vehicles from './pages/Vehicles';

function App() {
  const user = localStorage.getItem('user');

  return (
    <Router>
      <div className="relative min-h-screen">
        {/* Fixed Background */}
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(https://assets.bwbx.io/images/users/iqjWHBFdfxIU/iA7GVdn9DpeY/v1/-1x-1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
        
        {/* Overlay for better readability */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-0"></div>
        
        {/* Content Container */}
        <div className="relative z-10">
          <Routes>
            <Route 
              path="/" 
              element={
                <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
                  {user ? (
                    <div className="max-w-md mx-auto bg-white bg-opacity-95 backdrop-blur-sm p-6 rounded-lg shadow-xl text-center">
                      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Welcome back!</h2>
                      <p className="text-gray-600 mb-6">You are logged in.</p>
                      <div className="space-x-4">
                        <Link
                          to="/vehicles"
                          className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          Manage Vehicles
                        </Link>
                        <button
                          onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.reload();
                          }}
                          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto bg-white bg-opacity-95 backdrop-blur-sm p-6 rounded-lg shadow-xl text-center">
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        Parking Management System
                      </h1>
                      <p className="text-gray-600 mb-6">Welcome to the Parking Management System</p>
                      <p className="text-gray-600 mb-4">Please register or login to continue.</p>
                      <div className="space-x-4">
                        <Link
                          to="/register"
                          className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          Register
                        </Link>
                        <Link
                          to="/login"
                          className="inline-block px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Login
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              } 
            />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/vehicles" element={<Vehicles />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


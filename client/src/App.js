import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Vehicles from './pages/Vehicles';

function App() {
  const user = localStorage.getItem('user');

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
                  Parking Management System
                </h1>
                <p className="text-center text-gray-600 mb-8">
                  Welcome to the Parking Management System
                </p>
                {user ? (
                  <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md text-center">
                    <h2 className="text-2xl font-semibold mb-4">Welcome back!</h2>
                    <p className="text-gray-600 mb-6">You are logged in.</p>
                    <div className="space-x-4">
                      <Link
                        to="/vehicles"
                        className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Manage Vehicles
                      </Link>
                      <button
                        onClick={() => {
                          localStorage.removeItem('token');
                          localStorage.removeItem('user');
                          window.location.reload();
                        }}
                        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-gray-600 mb-4">Please register or login to continue.</p>
                    <div className="space-x-4">
                      <Link
                        to="/register"
                        className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Register
                      </Link>
                      <Link
                        to="/login"
                        className="inline-block px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
    </Router>
  );
}

export default App;


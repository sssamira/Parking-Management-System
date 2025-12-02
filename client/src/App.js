import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={
            <div className="container mx-auto px-4 py-8">
              <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
                Parking Management System
              </h1>
              <p className="text-center text-gray-600">
                Welcome to the Parking Management System
              </p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;


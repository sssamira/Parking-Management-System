import React from 'react';
import { Link } from 'react-router-dom';

const OwnerDashboard = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }

  const isOwner = user && (user.role === 'owner' || user.role === 'parkingowner');

  if (!isOwner) {
    window.location.href = '/owner/login';
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('localStorageChange'));
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 bg-white/70 backdrop-blur-md border-b border-indigo-100 shadow-sm">
        <div>
          <p className="text-sm text-indigo-500 font-semibold">Parking Owner Panel</p>
          <h1 className="text-xl font-bold text-indigo-900">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition font-semibold"
        >
          Logout
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-0 mt-10 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white p-8 border border-indigo-100 shadow-[0_20px_60px_-25px_rgba(63,81,181,0.35)]">
            <div className="text-3xl mb-4">🅿️</div>
            <h2 className="text-xl font-semibold text-indigo-900 mb-2">Parking Spot Requests</h2>
            <p className="text-gray-600 leading-relaxed">
              Submit parking spot creation requests for your parking lot. Admin approval flow can be connected next.
            </p>
            <Link
              to="/owner/spot-requests"
              className="inline-flex mt-4 px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Create Spot Request
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 border border-indigo-100 shadow-[0_20px_60px_-25px_rgba(16,185,129,0.35)]">
            <div className="text-3xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-indigo-900 mb-2">Approval Status</h2>
            <p className="text-gray-600 leading-relaxed">
              Track pending, approved, and rejected requests submitted by your account.
            </p>
            <Link
              to="/owner/approval-status"
              className="inline-flex mt-4 px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              View Approval Status
            </Link>
          </div>
        </div>

        {/* <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-semibold"
          >
            Go to Home
          </Link>
        </div> */}
      </div>
    </div>
  );
};

export default OwnerDashboard;

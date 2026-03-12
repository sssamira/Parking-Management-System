import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const AdminFines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOvertime, setCheckingOvertime] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeResult, setOvertimeResult] = useState(null);

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fines');
      setFines(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  const checkOvertimeVehicles = async () => {
    try {
      setCheckingOvertime(true);
      const response = await api.get('/fines/overtime-check');
      setOvertimeResult(response.data);
      await fetchFines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check overtime');
    } finally {
      setCheckingOvertime(false);
      setShowOvertimeModal(true);
    }
  };

  const handlePayFine = async (fineId) => {
    if (!window.confirm('Mark this fine as paid?')) return;
    try {
      await api.put(`/fines/${fineId}/pay`);
      fetchFines();
    } catch (err) {
      alert('Failed to mark as paid');
    }
  };

  const handleWaiveFine = async (fineId) => {
    if (!window.confirm('Waive this fine?')) return;
    try {
      await api.put(`/fines/${fineId}/waive`);
      fetchFines();
    } catch (err) {
      alert('Failed to waive fine');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatCurrency = (amount) => {
    return `৳${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">
                Fine Management System
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage parking fines for overtime vehicles
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              Back Home
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={fetchFines}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm"
          >
            Refresh
          </button>
          <button
            onClick={checkOvertimeVehicles}
            disabled={checkingOvertime}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></span>
            Check Overtime Vehicles
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-sm text-gray-500 uppercase">Total Fines</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{fines.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-sm text-gray-500 uppercase">Total Amount</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">
              {formatCurrency(fines.reduce((sum, f) => sum + f.fineAmount, 0))}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-sm text-gray-500 uppercase">Paid Fines</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">
              {fines.filter(f => f.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-sm text-gray-500 uppercase">Pending Fines</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">
              {fines.filter(f => f.status === 'issued').length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Plate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fine Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-in Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid Until
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fines.map((fine) => (
                  <tr key={fine._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fine.licensePlate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fine.overtimeHours} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-red-600 font-bold">
                        {formatCurrency(fine.fineAmount)}
                      </span>
                      <div className="text-xs text-gray-500">
                        ৳{fine.hourlyRate}/hour
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(fine.checkInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(fine.paidUntil)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        fine.status === 'paid' ? 'bg-green-100 text-green-800' :
                        fine.status === 'issued' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {fine.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-2">
                        {fine.status === 'issued' && (
                          <>
                            <button
                              onClick={() => handlePayFine(fine._id)}
                              className="px-4 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Mark as Paid
                            </button>
                            <button
                              onClick={() => handleWaiveFine(fine._id)}
                              className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Waive Fine
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => alert('View Details - Coming Soon')}
                          className="px-4 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Overtime Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Overtime Check Result</h3>
            <p>{overtimeResult?.message || 'No new overtime vehicles found.'}</p>
            <button
              onClick={() => setShowOvertimeModal(false)}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFines;
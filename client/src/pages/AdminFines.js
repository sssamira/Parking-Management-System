import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3001/api/fines', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load fines');
      }

      const data = await response.json();
      setFines(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkOvertimeVehicles = async () => {
    try {
      setCheckingOvertime(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3001/api/fines/overtime-check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check overtime vehicles');
      }

      const data = await response.json();
      setOvertimeResult(data);
      await fetchFines(); // Refresh fines list
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setCheckingOvertime(false);
      setShowOvertimeModal(true);
    }
  };

  const handlePayFine = async (fineId) => {
    if (!window.confirm('Mark this fine as paid?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/fines/${fineId}/pay`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update fine');
      }

      alert('Fine marked as paid');
      fetchFines(); // Refresh list
    } catch (err) {
      alert('Failed to update fine: ' + err.message);
    }
  };

  const handleWaiveFine = async (fineId) => {
    if (!window.confirm('Waive this fine?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/fines/${fineId}/waive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to waive fine');
      }

      alert('Fine waived');
      fetchFines(); // Refresh list
    } catch (err) {
      alert('Failed to waive fine: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      issued: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      waived: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
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
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
              Fine Management System
            </h1>
            <p className="text-gray-600 text-center">
              Monitor and manage parking fines for overtime vehicles
            </p>
          </div>

          {/* Navigation & Actions */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Back to Home
              </Link>
              <button
                onClick={fetchFines}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={checkOvertimeVehicles}
                disabled={checkingOvertime}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              >
                {checkingOvertime ? 'Checking...' : '🔍 Check Overtime Vehicles'}
              </button>
            </div>
          </div>

          {/* Overtime Check Modal */}
          {showOvertimeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md">
                <h3 className="text-xl font-bold mb-4">
                  {overtimeResult?.success ? '✅ Overtime Check Complete' : '⚠️ Check Failed'}
                </h3>
                <p className="mb-4">{overtimeResult?.message}</p>
                {overtimeResult?.data?.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold">Fines Issued:</p>
                    <ul className="list-disc pl-5">
                      {overtimeResult.data.map((fine, index) => (
                        <li key={index}>
                          {fine.licensePlate}: {formatCurrency(fine.fineAmount)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setShowOvertimeModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Fines</p>
              <p className="text-2xl font-bold">{fines.length}</p>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Amount</p>
              <p className="text-2xl font-bold">
                {formatCurrency(fines.reduce((sum, fine) => sum + fine.fineAmount, 0))}
              </p>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Paid Fines</p>
              <p className="text-2xl font-bold">
                {fines.filter(f => f.status === 'paid').length}
              </p>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Pending Fines</p>
              <p className="text-2xl font-bold">
                {fines.filter(f => f.status === 'issued').length}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading fines...</p>
            </div>
          ) : fines.length === 0 ? (
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Fines Issued Yet
              </h3>
              <p className="text-gray-600 mb-6">
                No parking fines have been issued yet. Check for overtime vehicles to issue fines.
              </p>
              <button
                onClick={checkOvertimeVehicles}
                className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Check Overtime Vehicles
              </button>
            </div>
          ) : (
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License Plate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Overtime Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fine Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-In Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fines.map((fine) => (
                      <tr key={fine._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {fine.licensePlate}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold">
                            {fine.overtimeHours} hrs
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(fine.fineAmount)}
                          </span>
                          <div className="text-xs text-gray-500">
                            ${fine.hourlyRate}/hour
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(fine.checkInTime)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(fine.paidUntil)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(fine.status)}`}>
                            {fine.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            {fine.status === 'issued' && (
                              <>
                                <button
                                  onClick={() => handlePayFine(fine._id)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  Mark as Paid
                                </button>
                                <button
                                  onClick={() => handleWaiveFine(fine._id)}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                >
                                  Waive Fine
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => alert(`Fine ID: ${fine._id}\nDetails: ${JSON.stringify(fine, null, 2)}`)}
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFines;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const UserFines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    fetchUserFines();
  }, []);

  const fetchUserFines = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch user profile to check payment method status
      try {
        const userResponse = await fetch('http://localhost:3001/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          // Update localStorage with latest user data
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
      }
  
      // Fetch fines
      const response = await fetch('http://localhost:3001/api/fines/my-fines', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to load fines');
      }
  
      const data = await response.json();
      setFines(data.data || []);
      
      // Calculate total unpaid
      const unpaid = data.data
        .filter(fine => !fine.isPaid && fine.status !== 'waived')
        .reduce((sum, fine) => sum + fine.fineAmount, 0);
      setTotalUnpaid(unpaid);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFine = async (fineId) => {
  if (!window.confirm('Are you sure you want to pay this fine? This will charge your saved payment method.')) return;

  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`http://localhost:3001/api/fines/${fineId}/pay-by-user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Check if error is due to missing payment method
      if (data.requiresPaymentSetup) {
        const shouldSetup = window.confirm(
          'No payment method found. You need to set up a payment method to pay fines. Would you like to set it up now?'
        );
        if (shouldSetup) {
          window.location.href = '/payment-method';
        }
        return;
      }
      throw new Error(data.message || 'Failed to process payment');
    }

    alert('✅ Fine paid successfully! Payment has been processed through your saved payment method.');
    fetchUserFines(); // Refresh fines list
  } catch (err) {
    console.error('Payment error:', err);
    alert('❌ Failed to pay fine: ' + err.message);
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

  const getStatusBadge = (status, isPaid) => {
    if (isPaid) {
      return 'bg-green-100 text-green-800';
    }
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      issued: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      waived: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  My Parking Fines
                </h1>
                <p className="text-gray-600">
                  View and manage your parking fines
                </p>
              </div>
              <Link
                to="/"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                ← Back to Home
              </Link>
            </div>
            
            {/* Stats Card */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Total Fines</p>
                <p className="text-2xl font-bold">{fines.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Unpaid Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalUnpaid)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-500 text-sm">Paid Fines</p>
                <p className="text-2xl font-bold text-green-600">
                  {fines.filter(f => f.isPaid).length}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {/* ADD THIS: Payment Method Warning */}
          {user && !user.hasPaymentMethod && fines.filter(f => !f.isPaid && f.status !== 'waived').length > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💳</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-yellow-800">Payment Method Required</h3>
                  <p className="text-yellow-700">
                    You need to set up a payment method to pay your fines. 
                    <Link to="/payment-method" className="ml-1 font-semibold text-yellow-900 underline">
                      Set up payment method →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your fines...</p>
            </div>
          ) : fines.length === 0 ? (
            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Fines Found
              </h3>
              <p className="text-gray-600 mb-6">
                You don't have any parking fines at the moment. Keep following parking rules!
              </p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Issued
                      </th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(fine.issuedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {fine.licensePlate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                            {fine.overtimeHours} hours
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(fine.fineAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(fine.paidUntil)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(fine.status, fine.isPaid)}`}>
                            {fine.isPaid ? 'PAID' : fine.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!fine.isPaid && fine.status !== 'waived' ? (
                            <button
                              onClick={() => handlePayFine(fine._id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-2"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <span className="text-gray-500">No action required</span>
                          )}
                          <button
                            onClick={() => alert(`Fine ID: ${fine._id}\nDetails: ${JSON.stringify(fine, null, 2)}`)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Important Information</h3>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Fines are issued when vehicles exceed their paid parking time</li>
              <li>Fine rate: $10 per overtime hour (rounded up)</li>
              <li>Unpaid fines may prevent future bookings</li>
              <li>Contact admin if you believe a fine was issued incorrectly</li>
              <li>Payment is simulated for demonstration purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFines;
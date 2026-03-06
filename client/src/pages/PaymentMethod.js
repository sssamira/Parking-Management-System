import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const PaymentMethod = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Get fresh user data from backend
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error('Error loading user:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        // Fallback to localStorage user
        const userStr = localStorage.getItem('user');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestPayment = async () => {
    setTestLoading(true);
    try {
      const response = await api.post('/payment/create-checkout-session', {
        amount: 100, // 100 BDT
        currency: 'BDT',
        description: 'Test SSLCommerz Payment',
      });

      if (response.data && response.data.url) {
        // Redirect to SSLCommerz
        window.location.href = response.data.url;
      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login to manage payment methods</p>
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff] text-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-indigo-900">Payment Method</h1>
          <div className="w-24"></div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Secure Payments via SSLCommerz
            </h2>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6 text-left">
              <p className="text-green-800 font-semibold mb-3">Payment Gateway Active</p>
              <p className="text-gray-700 mb-4">
                We use SSLCommerz for secure payment processing. You don't need to save a card here.
                When you book a parking spot or exit, you will be redirected to the secure payment gateway to complete your transaction.
              </p>
              <p className="text-sm text-gray-600">
                Supported methods: Visa, Mastercard, bKash, Rocket, Nagad, and more.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleTestPayment}
                disabled={testLoading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center"
              >
                {testLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💳</span>
                    Test SSLCommerz Payment (100 BDT)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How It Works</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">1.</span>
              <p>Book a parking spot or proceed to checkout</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">2.</span>
              <p>You will be redirected to the secure SSLCommerz payment page</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">3.</span>
              <p>Choose your preferred payment method (Card, Mobile Banking, etc.)</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">4.</span>
              <p>Complete the payment securely</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">5.</span>
              <p>You will be redirected back to the app with a confirmation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;

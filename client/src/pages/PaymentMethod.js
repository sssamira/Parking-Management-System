import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../utils/api';

// Initialize Stripe - Get publishable key from environment
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('⚠️ REACT_APP_STRIPE_PUBLISHABLE_KEY is not set in environment variables!');
  console.error('   Please add REACT_APP_STRIPE_PUBLISHABLE_KEY to your client/.env file');
  console.error('   Get your key from: https://dashboard.stripe.com/test/apikeys');
}

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const PaymentMethodForm = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError('Stripe is not loaded yet. Please wait...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card element not found');
        setLoading(false);
        return;
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        setError(pmError.message);
        setLoading(false);
        return;
      }

      // Save to backend
      const response = await api.post('/auth/payment-method', {
        paymentMethodId: paymentMethod.id,
      });

      if (response.data) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error('Save payment method error:', err);
      setError(err.response?.data?.message || 'Failed to save payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
        <CardElement options={cardElementOptions} />
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? 'Saving...' : 'Save Payment Method'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center">
        Your payment information is securely processed by Stripe. We never store your full card details.
      </p>
    </form>
  );
};

const PaymentMethod = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

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

  const handleSuccess = (data) => {
    window.alert('✅ Payment method saved successfully!');
    setShowForm(false);
    // Refresh user data
    checkAuthAndLoadUser();
    // Trigger localStorage update event
    window.dispatchEvent(new Event('localStorageChange'));
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your payment method? You will need to add it again for automatic payments.')) {
      return;
    }

    setRemoving(true);
    try {
      await api.delete('/auth/payment-method');
      window.alert('Payment method removed successfully');
      checkAuthAndLoadUser();
      window.dispatchEvent(new Event('localStorageChange'));
    } catch (err) {
      console.error('Remove payment method error:', err);
      window.alert(err.response?.data?.message || 'Failed to remove payment method');
    } finally {
      setRemoving(false);
    }
  };

  const formatCardBrand = (brand) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
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

  // Check if Stripe is configured
  if (!stripePublishableKey || !stripePromise) {
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
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Stripe Not Configured
              </h2>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6 text-left">
                <p className="text-red-800 font-semibold mb-3">Setup Required:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-red-700">
                  <li>Get your Stripe API keys from <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Stripe Dashboard</a></li>
                  <li>Create a <code className="bg-red-100 px-1 rounded">client/.env</code> file</li>
                  <li>Add: <code className="bg-red-100 px-1 rounded">REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...</code></li>
                  <li>Create a <code className="bg-red-100 px-1 rounded">server/.env</code> file</li>
                  <li>Add: <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY=sk_test_...</code></li>
                  <li>Restart both client and server</li>
                </ol>
              </div>
              <p className="text-gray-600 text-sm">
                Payment methods cannot be saved until Stripe is properly configured.
              </p>
            </div>
          </div>
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
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {user.hasPaymentMethod ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Saved Payment Method</p>
                    <p className="text-2xl font-bold text-gray-900">
                      •••• •••• •••• {user.paymentMethodLast4}
                    </p>
                  </div>
                  <div className="text-4xl">💳</div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Card Type</p>
                      <p className="font-semibold text-gray-900">
                        {formatCardBrand(user.paymentMethodBrand)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Expires</p>
                      <p className="font-semibold text-gray-900">
                        {user.paymentMethodExpMonth?.toString().padStart(2, '0')}/
                        {user.paymentMethodExpYear?.toString().slice(-2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Automatic Payments:</strong> Your parking fees will be automatically charged to this card when you exit a parking spot.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  Update Payment Method
                </button>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {removing ? 'Removing...' : 'Remove'}
                </button>
              </div>

              {showForm && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Update Payment Method</h3>
                  <Elements stripe={stripePromise}>
                    <PaymentMethodForm 
                      onSuccess={handleSuccess} 
                      onCancel={() => setShowForm(false)}
                    />
                  </Elements>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">💳</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  No Payment Method Saved
                </h2>
                <p className="text-gray-600 mb-6">
                  Add a payment method to enable automatic payments for parking fees.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Note:</strong> Without a saved payment method, you'll need to pay manually when exiting a parking spot. Adding a payment method allows for automatic, seamless payments.
                </p>
              </div>

              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium text-lg transition-colors"
                >
                  Add Payment Method
                </button>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>
                  <Elements stripe={stripePromise}>
                    <PaymentMethodForm 
                      onSuccess={handleSuccess} 
                      onCancel={() => setShowForm(false)}
                    />
                  </Elements>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How It Works</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">1.</span>
              <p>Save your payment method securely using Stripe</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">2.</span>
              <p>When you book a parking spot, the admin records your entry time</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">3.</span>
              <p>When you exit, the admin records your exit time</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">4.</span>
              <p>The system automatically calculates the parking fee and charges your saved payment method</p>
            </div>
            <div className="flex items-start">
              <span className="text-indigo-600 font-bold mr-3">5.</span>
              <p>You receive a confirmation email with payment details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;


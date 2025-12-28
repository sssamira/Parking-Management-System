import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../utils/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    driverLicense: '',
    address: '',
    vehicles: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);

  const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Motorcycle', 'Other'];

  const finalizeRegistration = (payload) => {
    if (payload.token) {
      localStorage.setItem('token', payload.token);
    }

    if (payload.user) {
      localStorage.setItem('user', JSON.stringify(payload.user));
    } else {
      const { token, message: responseMessage, ...userData } = payload;
      localStorage.setItem('user', JSON.stringify(userData));
    }

    setSuccess(true);
    setErrors({});
    window.dispatchEvent(new Event('localStorageChange'));

    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('vehicle.')) {
      const [_, vehicleIndex, field] = name.split('.');
      const index = parseInt(vehicleIndex);
      const updatedVehicles = [...formData.vehicles];
      updatedVehicles[index] = {
        ...updatedVehicles[index],
        [field]: value,
      };
      setFormData({
        ...formData,
        vehicles: updatedVehicles,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleNumberSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (numberOfVehicles < 1) {
      setErrors({ submit: 'Minimum 1 vehicle is required. Please enter a number greater than 0' });
      setNumberOfVehicles(1);
      return;
    }
    
    // Create array of empty vehicle forms
    const newVehicles = Array.from({ length: numberOfVehicles }, () => ({
      licensePlate: '',
      carType: '',
      carModel: '',
      carColor: '',
      carYear: '',
    }));
    
    console.log('Creating vehicles:', numberOfVehicles, newVehicles);
    
    setFormData(prevFormData => ({
      ...prevFormData,
      vehicles: newVehicles,
    }));
    setShowNumberInput(false);
    setErrors({});
  };

  const addVehicle = () => {
    setShowNumberInput(true);
  };

  const removeVehicle = (index) => {
    if (formData.vehicles.length > 1) {
      const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        vehicles: updatedVehicles,
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.driverLicense.trim()) newErrors.driverLicense = 'Driver license is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    // Validate vehicles
    if (!formData.vehicles || formData.vehicles.length === 0) {
      newErrors.vehicles = 'Please add at least one vehicle';
    } else {
      formData.vehicles.forEach((vehicle, index) => {
        if (!vehicle.licensePlate.trim()) {
          newErrors[`vehicle.${index}.licensePlate`] = 'License plate is required';
        }
        if (!vehicle.carType) {
          newErrors[`vehicle.${index}.carType`] = 'Car type is required';
        }
        if (!vehicle.carModel.trim()) {
          newErrors[`vehicle.${index}.carModel`] = 'Car model is required';
        }
        if (!vehicle.carColor.trim()) {
          newErrors[`vehicle.${index}.carColor`] = 'Car color is required';
        }
        if (!vehicle.carYear) {
          newErrors[`vehicle.${index}.carYear`] = 'Car year is required';
        } else if (vehicle.carYear < 1900 || vehicle.carYear > new Date().getFullYear() + 1) {
          newErrors[`vehicle.${index}.carYear`] = 'Invalid car year';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(false);
    setErrors({});
    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Convert carYear to number for each vehicle
      const formattedData = {
        ...registerData,
        vehicles: registerData.vehicles.map(vehicle => ({
          ...vehicle,
          carYear: vehicle.carYear ? parseInt(vehicle.carYear, 10) : null,
        })),
      };
      
      const response = await api.post('/auth/register', formattedData);
      finalizeRegistration(response.data);
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
      });
      
      // Handle validation errors from server
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.field) {
            validationErrors[err.field] = err.message;
          }
        });
        setErrors({ ...validationErrors, submit: error.response.data.message || 'Please fix the errors above' });
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        // Network error - server might not be running
        const apiUrl = error.config?.baseURL || 'http://localhost:3001/api';
        setErrors({ 
          submit: `Cannot connect to server at ${apiUrl}. Please make sure the backend server is running. Check the console for the API URL being used.` 
        });
      } else if (error.code === 'ECONNREFUSED') {
        setErrors({ 
          submit: 'Connection refused. The server might not be running. Please start the backend server.' 
        });
      } else if (error.code === 'ECONNABORTED') {
        setErrors({ submit: 'Request timeout. The server took too long to respond. Please try again.' });
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.message || 
                           error.message || 
                           'Registration failed. Please try again.';
        setErrors({ submit: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      setErrors({});
      setSuccess(false);

      const credential = credentialResponse?.credential;
      if (!credential) {
        setErrors({ submit: 'Google sign-in failed. Please try again.' });
        return;
      }

      const response = await api.post('/auth/google', { credential });
      finalizeRegistration(response.data);
    } catch (error) {
      console.error('Google registration error:', error);
      const message = error.response?.data?.message || error.message || 'Google sign-in failed. Please try again.';
      setErrors({ submit: message });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleLoading(false);
    setErrors({ submit: 'Google sign-in was cancelled or failed. Please try again.' });
  };

  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef(null);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Landing Page Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-purple-600 via-purple-500 to-pink-500 relative overflow-hidden">
        {/* Plus Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)',
            backgroundSize: '20px 20px'
          }}
        ></div>
        
        <div className="relative z-10 w-full flex flex-col p-12">
          {/* Empty space where badge was */}
          <div className="mb-8"></div>
          
          {/* Main Content */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              <span className="text-white">Start Your Journey To </span>
              <br />
              <span className="text-yellow-300">Smart Parking</span>
            </h1>
            
            <p className="text-xl text-white leading-relaxed max-w-md">
              Create your account and unlock powerful parking management tools.
            </p>
            
            <div className="mt-8">
              <p className="text-lg text-white font-semibold mb-4">WHAT YOU'LL GET</p>
              <ul className="space-y-3 text-white">
                <li className="flex items-center gap-2">
                  <span className="text-yellow-300">✓</span>
                  <span>Real-time parking space tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-300">✓</span>
                  <span>AI-powered parking recommendations</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-300">✓</span>
                  <span>Seamless payment processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-300">✓</span>
                  <span>24/7 customer support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">
          {/* Close Button */}
          <Link 
            to="/"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          
          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create account
          </h2>
          
          {/* Subtitle */}
          <p className="text-gray-600 mb-8">
            Get started with your free account
          </p>
          
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Account created successfully! Redirecting...</span>
              </div>
            </div>
          )}
          {errors.submit && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {errors.submit}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Google Sign Up Button */}
            <div className="w-full relative">
              <div ref={googleButtonRef} className="absolute inset-0 opacity-0 z-10 pointer-events-none">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  width="100%"
                  text="signup_with"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const googleButton = googleButtonRef.current?.querySelector('div[role="button"]');
                  if (googleButton) {
                    googleButton.click();
                  } else {
                    setTimeout(() => {
                      const btn = googleButtonRef.current?.querySelector('div[role="button"]');
                      if (btn) btn.click();
                    }, 100);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-gray-700 font-medium">Sign up with Google</span>
              </button>
            </div>
            {googleLoading && (
              <p className="text-center text-sm text-gray-600">Creating your account with Google...</p>
            )}
            
            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
              </div>
            </div>

            {/* Personal Information - Initial Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
              
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                    placeholder="name@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              
              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label htmlFor="driverLicense" className="block text-sm font-medium text-gray-700 mb-2">
                    Driver License Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <input
                      id="driverLicense"
                      name="driverLicense"
                      type="text"
                      required
                      value={formData.driverLicense}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.driverLicense ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                      placeholder="DL123456789"
                    />
                  </div>
                  {errors.driverLicense && <p className="mt-1 text-sm text-red-600">{errors.driverLicense}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.address ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Account Security</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-10 py-3 border ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none`}
                      placeholder="Re-enter password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Information</h3>
                {!showNumberInput && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How many vehicles do you want to add?
                    </label>
                    <button
                      type="button"
                      onClick={addVehicle}
                      className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Select Number of Vehicles
                    </button>
                  </div>
                )}
              </div>

              {/* Number Input Form */}
              {showNumberInput && formData.vehicles.length === 0 && (
                <div className="mb-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="text-md font-semibold mb-3 text-gray-800">
                    How many vehicles do you want to add?
                  </h4>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Vehicles (Minimum: 1)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={numberOfVehicles}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value < 1) {
                            setNumberOfVehicles(1);
                          } else {
                            setNumberOfVehicles(value);
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          if (value < 1) {
                            setNumberOfVehicles(1);
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter number (minimum 1)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        You can add as many vehicles as you want (minimum 1)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleNumberSubmit}
                        className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNumberInput(false);
                          setNumberOfVehicles(1);
                        }}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Detail Boxes - Only show after Continue is clicked */}
              {formData.vehicles && formData.vehicles.length > 0 && !showNumberInput && (
                <div className="space-y-4 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Vehicle Details ({formData.vehicles.length} vehicle{formData.vehicles.length > 1 ? 's' : ''})
                  </h4>
                  {formData.vehicles.map((vehicle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-700">
                      Vehicle {index + 1}
                    </h4>
                    {formData.vehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVehicle(index)}
                        className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`vehicle.${index}.licensePlate`} className="block text-sm font-medium text-gray-700">
                        License Plate Number *
                      </label>
                      <input
                        id={`vehicle.${index}.licensePlate`}
                        name={`vehicle.${index}.licensePlate`}
                        type="text"
                        required
                        value={vehicle.licensePlate}
                        onChange={handleChange}
                        className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                          errors[`vehicle.${index}.licensePlate`] ? 'border-red-300' : 'border-gray-300'
                        } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm uppercase`}
                        placeholder="ABC1234"
                        style={{ textTransform: 'uppercase' }}
                      />
                      {errors[`vehicle.${index}.licensePlate`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`vehicle.${index}.licensePlate`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`vehicle.${index}.carType`} className="block text-sm font-medium text-gray-700">
                        Car Type *
                      </label>
                      <select
                        id={`vehicle.${index}.carType`}
                        name={`vehicle.${index}.carType`}
                        required
                        value={vehicle.carType}
                        onChange={handleChange}
                        className={`mt-1 block w-full px-3 py-2 border ${
                          errors[`vehicle.${index}.carType`] ? 'border-red-300' : 'border-gray-300'
                        } bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      >
                        <option value="">Select car type</option>
                        {carTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {errors[`vehicle.${index}.carType`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`vehicle.${index}.carType`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`vehicle.${index}.carModel`} className="block text-sm font-medium text-gray-700">
                        Car Model *
                      </label>
                      <input
                        id={`vehicle.${index}.carModel`}
                        name={`vehicle.${index}.carModel`}
                        type="text"
                        required
                        value={vehicle.carModel}
                        onChange={handleChange}
                        className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                          errors[`vehicle.${index}.carModel`] ? 'border-red-300' : 'border-gray-300'
                        } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                        placeholder="Toyota Camry"
                      />
                      {errors[`vehicle.${index}.carModel`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`vehicle.${index}.carModel`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`vehicle.${index}.carColor`} className="block text-sm font-medium text-gray-700">
                        Car Color *
                      </label>
                      <input
                        id={`vehicle.${index}.carColor`}
                        name={`vehicle.${index}.carColor`}
                        type="text"
                        required
                        value={vehicle.carColor}
                        onChange={handleChange}
                        className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                          errors[`vehicle.${index}.carColor`] ? 'border-red-300' : 'border-gray-300'
                        } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                        placeholder="Red"
                      />
                      {errors[`vehicle.${index}.carColor`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`vehicle.${index}.carColor`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`vehicle.${index}.carYear`} className="block text-sm font-medium text-gray-700">
                        Car Year *
                      </label>
                      <input
                        id={`vehicle.${index}.carYear`}
                        name={`vehicle.${index}.carYear`}
                        type="number"
                        required
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={vehicle.carYear}
                        onChange={handleChange}
                        className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                          errors[`vehicle.${index}.carYear`] ? 'border-red-300' : 'border-gray-300'
                        } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                        placeholder="2020"
                      />
                      {errors[`vehicle.${index}.carYear`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`vehicle.${index}.carYear`]}</p>
                      )}
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;



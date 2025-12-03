import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberOfVehicles, setNumberOfVehicles] = useState(1);

  const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Motorcycle', 'Other'];

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
      
      // Store token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // Redirect to home or dashboard
      navigate('/');
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
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8 bg-white bg-opacity-95 backdrop-blur-sm p-8 rounded-lg shadow-xl">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create Your Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Register with your vehicle and driver details
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errors.submit && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="+1234567890"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="driverLicense" className="block text-sm font-medium text-gray-700">
                    Driver License Number *
                  </label>
                  <input
                    id="driverLicense"
                    name="driverLicense"
                    type="text"
                    required
                    value={formData.driverLicense}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.driverLicense ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="DL123456789"
                  />
                  {errors.driverLicense && <p className="mt-1 text-sm text-red-600">{errors.driverLicense}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address *
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="123 Main St, City, State, ZIP"
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Account Security</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Minimum 6 characters"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Re-enter password"
                  />
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

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
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



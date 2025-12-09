import axios from 'axios';

// Determine the base URL
// In development, use relative URL to leverage React proxy, or use env variable
// In production, use the environment variable or default
const getBaseURL = () => {
  // If REACT_APP_API_URL is set, use it (takes priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In development, use relative URL to leverage proxy in package.json
  // The proxy in package.json points to http://localhost:3001
  // This allows the React dev server to proxy requests to the backend
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }
  
  // Production fallback - use relative URL
  return '/api';
};

const baseURL = getBaseURL();

// Create axios instance with base URL
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout (increased for slower connections)
});

// Log API base URL for debugging
console.log('🔗 API Base URL:', api.defaults.baseURL);
console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('⚙️  REACT_APP_API_URL:', process.env.REACT_APP_API_URL || 'not set');

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-redirect if it's not already being handled by the component
    // Components should handle 401 errors themselves to show proper error messages
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;


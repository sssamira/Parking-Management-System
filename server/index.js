import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/psm';

// MongoDB connection options with better timeout settings
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // Timeout after 30s (increased for slow connections)
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  connectTimeoutMS: 30000, // Give up initial connection after 30s
  bufferCommands: true, // Enable mongoose buffering to queue commands until connection is ready
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 1, // Maintain at least 1 socket connection
  retryWrites: true, // Retry write operations if they fail due to transient network errors
};

// Set up connection event listeners (before connection attempt)
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
});

// Connect to MongoDB function with retry logic
const connectDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Trim the connection string to remove any whitespace
      const cleanURI = MONGODB_URI.trim();
      
      if (i > 0) {
        console.log(`🔄 Retrying MongoDB connection (attempt ${i + 1}/${retries})...`);
      } else {
        console.log('🔄 Attempting to connect to MongoDB...');
      }
      
      await mongoose.connect(cleanURI, mongooseOptions);
      console.log('✅ MongoDB Connected Successfully');
      console.log(`📦 Database: ${mongoose.connection.name}`);
      console.log(`🔗 Connection URI: ${cleanURI.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
      
      return true;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (attempt ${i + 1}/${retries}):`, error.message);
      
      if (i === retries - 1) {
        // Last attempt failed
        console.error('⚠️  All MongoDB connection attempts failed.');
        console.error('💡 To fix MongoDB connection:');
        console.error('   1. Check if MongoDB Atlas cluster is running (not paused)');
        console.error('   2. Verify your IP address is whitelisted in MongoDB Atlas');
        console.error('   3. Check your network connection');
        console.error('   4. Verify MONGODB_URI in .env file is correct');
        console.error('   5. For local MongoDB, use: mongodb://localhost:27017/psm');
        console.error('   6. Make sure MongoDB service is running (if using local MongoDB)');
        
        // Try to connect in the background
        console.log('🔄 Will continue attempting to connect in the background...');
        setTimeout(() => connectDB(1), 5000); // Retry once after 5 seconds
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Routes
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'not connected';
  res.json({ 
    message: 'Parking Management System API is running!',
    database: dbStatus,
    readyState: mongoose.connection.readyState
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1;
  res.json({ 
    status: 'ok',
    database: dbStatus ? 'connected' : 'not connected',
    readyState: mongoose.connection.readyState
  });
});

// Import routes
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import searchQueryRoutes from './routes/searchQueryRoutes.js';

// Middleware to check database connection before processing requests
// Allow health check and some routes to work even if DB is not connected
app.use('/api', (req, res, next) => {
  const readyState = mongoose.connection.readyState;
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  
  // Allow health check and some read-only operations even if DB is connecting
  const allowedPaths = ['/api/auth/health', '/api/health'];
  const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
  
  if (readyState === 0 && !isAllowedPath) {
    // Not connected and not an allowed path
    console.warn(`⚠️  Database not connected. Blocking request to: ${req.path}`);
    return res.status(503).json({ 
      message: 'Database connection not available. Please try again in a moment.',
      error: 'Database not connected',
      readyState: readyState
    });
  }
  
  // If connecting (state 2), allow the request but log a warning
  if (readyState === 2 && !isAllowedPath) {
    console.log(`⏳ Database is connecting. Processing request to: ${req.path}`);
  }
  
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/search-queries', searchQueryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Start server after MongoDB connection
const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();
  
  // Start the server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
    console.log(`🔗 Frontend should connect to: http://localhost:${PORT}/api`);
  });

  // Handle port already in use error
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please:`);
      console.error(`   1. Stop the process using port ${PORT}`);
      console.error(`   2. Or change the PORT in your .env file`);
      console.error(`   3. Or use: netstat -ano | findstr :${PORT} to find the process`);
      process.exit(1);
    } else {
      throw error;
    }
  });
};

// Start the application
startServer();



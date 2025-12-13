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
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 1, // Maintain at least 1 socket connection
  retryWrites: true, // Retry write operations if they fail due to transient network errors
};

// Set up connection event listeners (before connection attempt)
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  // Don't crash - just log the error
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected - Attempting to reconnect...');
  // Automatically try to reconnect
  setTimeout(() => {
    if (mongoose.connection.readyState === 0) {
      console.log('🔄 Attempting automatic reconnection...');
      connectDB(1).catch(err => {
        console.error('❌ Auto-reconnection failed:', err.message);
      });
    }
  }, 5000); // Wait 5 seconds before reconnecting
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected successfully');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
});

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received. Closing MongoDB connection...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received. Closing MongoDB connection...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

// Connect to MongoDB function with retry logic
const connectDB = async (retries = 3) => {
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB is already connected');
    return true;
  }

  // If currently connecting, wait a bit
  if (mongoose.connection.readyState === 2) {
    console.log('⏳ MongoDB connection in progress, waiting...');
    return false;
  }

  for (let i = 0; i < retries; i++) {
    try {
      // Trim the connection string to remove any whitespace
      const cleanURI = MONGODB_URI.trim();
      
      if (i > 0) {
        console.log(`🔄 Retrying MongoDB connection (attempt ${i + 1}/${retries})...`);
      } else {
        console.log('🔄 Attempting to connect to MongoDB...');
      }
      
      // Only connect if not already connected
      if (mongoose.connection.readyState === 0) {
        // Clear any existing connection state
        if (mongoose.connection.db) {
          await mongoose.connection.close();
        }
        await mongoose.connect(cleanURI, mongooseOptions);
      }
      
      console.log('✅ MongoDB Connected Successfully');
      console.log(`📦 Database: ${mongoose.connection.name}`);
      console.log(`🔗 Connection URI: ${cleanURI.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
      
      return true;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (attempt ${i + 1}/${retries}):`, error.message);
      
      // If connection was established but then failed, don't retry immediately
      if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
        // Network/server errors - wait longer before retry
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } else {
        // Other errors - wait shorter
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
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
        
        // Try to connect in the background after a longer delay
        console.log('🔄 Will continue attempting to connect in the background...');
        setTimeout(() => {
          if (mongoose.connection.readyState === 0) {
            connectDB(1).catch(err => {
              console.error('❌ Background reconnection failed:', err.message);
            });
          }
        }, 10000); // Wait 10 seconds before background retry
        return false;
      }
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
import fineRoutes from './routes/fineRoutes.js';
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
app.use('/api/fines', fineRoutes);
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
  // Try to connect to MongoDB, but don't block server startup
  connectDB().catch(err => {
    console.error('⚠️  Initial MongoDB connection failed, but server will continue running');
    console.error('💡 Server will attempt to reconnect automatically');
  });
  
  // Start the server regardless of MongoDB connection status
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
    console.log(`🔗 Frontend should connect to: http://localhost:${PORT}/api`);
    
    // Check MongoDB status
    const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️  Not Connected';
    console.log(`📦 MongoDB Status: ${dbStatus}`);
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

  // Handle uncaught exceptions to prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('⚠️  Server will continue running, but some features may not work');
    // Don't exit - let the server continue
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('⚠️  Server will continue running');
    // Don't exit - let the server continue
  });
};

// Start the application
startServer();

// Start scheduled jobs
// import checkBookingExpirations from './jobs/checkBookingExpirations.js';
// checkBookingExpirations();


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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-management';

// Connect to MongoDB (non-blocking - server will start even if MongoDB fails)
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('⚠️  Server will continue running, but database operations will fail.');
    console.error('💡 To fix MongoDB connection:');
    console.error('   1. Make sure MongoDB is running locally');
    console.error('   2. Or use MongoDB Atlas (cloud) and update MONGODB_URI in .env');
    console.error('   3. For local MongoDB without auth, use: mongodb://localhost:27017/parking-management');
    console.error('   4. For MongoDB with auth, use: mongodb://username:password@localhost:27017/parking-management?authSource=admin');
    // Server continues running even if MongoDB connection fails
  });

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Parking Management System API is running!' });
});

// Import routes
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import searchQueryRoutes from './routes/searchQueryRoutes.js';

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


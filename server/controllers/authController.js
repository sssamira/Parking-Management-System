import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      driverLicense,
      address,
      vehicles,
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate that at least one vehicle is provided
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({ message: 'At least one vehicle is required' });
    }

    // Check if any license plate already exists
    const licensePlates = vehicles.map(v => v.licensePlate.toUpperCase());
    const existingVehicles = await User.find({
      'vehicles.licensePlate': { $in: licensePlates }
    });

    if (existingVehicles.length > 0) {
      const existingPlates = existingVehicles.flatMap(u => 
        u.vehicles.map(v => v.licensePlate)
      );
      const duplicates = licensePlates.filter(lp => existingPlates.includes(lp));
      return res.status(400).json({ 
        message: `License plate(s) already registered: ${duplicates.join(', ')}` 
      });
    }

    // Format vehicles array
    const formattedVehicles = vehicles.map(vehicle => ({
      licensePlate: vehicle.licensePlate ? vehicle.licensePlate.toUpperCase().trim() : '',
      carType: vehicle.carType,
      carModel: vehicle.carModel ? vehicle.carModel.trim() : '',
      carColor: vehicle.carColor ? vehicle.carColor.trim() : '',
      carYear: parseInt(vehicle.carYear) || vehicle.carYear,
    }));

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      driverLicense,
      address,
      vehicles: formattedVehicles,
    });

    if (user) {
      console.log('✅ User created successfully:', user.email);
      console.log('✅ Vehicles added:', user.vehicles.length);
      console.log('✅ User saved to database with ID:', user._id);
      
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        driverLicense: user.driverLicense,
        address: user.address,
        vehicles: user.vehicles,
        token: generateToken(user._id),
        message: `Account created successfully! Your account with ${user.vehicles.length} vehicle(s) has been added to the database.`,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: messages.join(', '),
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'email' ? 'Email' : 'License plate'} already exists` 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    console.log('🔐 Login attempt for email:', email);
    console.log('🔐 Password received (length):', password ? password.length : 0);

    // Normalize email to lowercase and trim password
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Check if user exists and get password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log('❌ User not found:', normalizedEmail);
      console.log('🔍 Searching for users with similar emails...');
      // Debug: Check if there are any users at all
      const allUsers = await User.find({}).select('email');
      console.log('🔍 All users in database:', allUsers.map(u => u.email));
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ User found:', user.email);
    console.log('🔍 User ID:', user._id);
    
    // Check if password field exists
    if (!user.password) {
      console.log('❌ Password field is missing or null');
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log('🔍 Password hash exists:', user.password ? 'Yes' : 'No');
    console.log('🔍 Password hash length:', user.password ? user.password.length : 0);
    console.log('🔍 Password hash starts with:', user.password ? user.password.substring(0, 10) : 'N/A');
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isPasswordHashed = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'));
    console.log('🔍 Password is hashed:', isPasswordHashed);
    
    console.log('🔍 Checking password...');
    console.log('🔍 Entered password length:', trimmedPassword.length);

    // Check password
    let isPasswordMatch = false;
    
    if (isPasswordHashed) {
      // Password is hashed, use bcrypt comparison
      try {
        // First try the model method with trimmed password
        isPasswordMatch = await user.matchPassword(trimmedPassword);
        console.log('🔍 Password match result (model method):', isPasswordMatch);
        
        // If that fails, try direct bcrypt comparison
        if (!isPasswordMatch) {
          console.log('🔍 Trying direct bcrypt comparison...');
          isPasswordMatch = await bcrypt.compare(trimmedPassword, user.password);
          console.log('🔍 Password match result (direct bcrypt):', isPasswordMatch);
        }
      } catch (compareError) {
        console.error('❌ Password comparison error:', compareError);
        console.error('❌ Error stack:', compareError.stack);
        // Try direct bcrypt as fallback
        try {
          isPasswordMatch = await bcrypt.compare(trimmedPassword, user.password);
          console.log('🔍 Fallback bcrypt comparison result:', isPasswordMatch);
        } catch (fallbackError) {
          console.error('❌ Fallback comparison also failed:', fallbackError);
          return res.status(500).json({ message: 'Error during password verification' });
        }
      }
    } else {
      // Password is NOT hashed (stored as plain text) - this is a security issue but we'll handle it
      console.log('⚠️ WARNING: Password is stored as plain text! This is a security issue.');
      console.log('⚠️ Comparing plain text passwords...');
      isPasswordMatch = trimmedPassword === user.password;
      console.log('🔍 Plain text password match:', isPasswordMatch);
      
      // If password matches, hash it for future use
      if (isPasswordMatch) {
        console.log('🔒 Hashing password for future use...');
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(trimmedPassword, salt);
        await user.save();
        console.log('✅ Password has been hashed and saved');
      }
    }
    
    if (isPasswordMatch) {
      console.log('✅ Login successful for:', user.email);
      const token = generateToken(user._id);
      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          driverLicense: user.driverLicense,
          address: user.address,
          vehicles: user.vehicles,
          role: user.role,
        },
        message: 'Login successful',
      });
    } else {
      console.log('❌ Invalid password for:', user.email);
      console.log('🔍 Password provided length:', password.length);
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      driverLicense: user.driverLicense,
      address: user.address,
      vehicles: user.vehicles,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



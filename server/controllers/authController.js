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

    // Trim password to ensure consistency
    const trimmedPassword = password.trim();
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: trimmedPassword, // Use trimmed password
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
    // Don't trim password here - we want to compare exactly what user entered
    // But we'll handle trimming in the comparison logic
    const enteredPassword = password; // Keep original, but we'll trim during comparison if needed

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
    console.log('🔍 Entered password length:', enteredPassword.length);
    
    // Normalize password - trim whitespace (passwords shouldn't have leading/trailing spaces)
    const normalizedPassword = enteredPassword.trim();
    
    // Check password
    let isPasswordMatch = false;
    
    try {
      if (isPasswordHashed) {
        // Password is hashed, use bcrypt comparison
        console.log('🔍 Using bcrypt comparison (password is hashed)');
        
        // Try the model method first
        isPasswordMatch = await user.matchPassword(normalizedPassword);
        console.log('🔍 Password match (model method):', isPasswordMatch);
        
        // If model method fails, try direct bcrypt
        if (!isPasswordMatch) {
          console.log('🔍 Trying direct bcrypt comparison...');
          isPasswordMatch = await bcrypt.compare(normalizedPassword, user.password);
          console.log('🔍 Password match (direct bcrypt):', isPasswordMatch);
        }
      } else {
        // Password is NOT hashed (stored as plain text) - security issue but handle it
        console.log('⚠️ WARNING: Password stored as plain text!');
        isPasswordMatch = normalizedPassword === user.password.trim();
        console.log('🔍 Plain text password match:', isPasswordMatch);
        
        // If matches, hash it for future use (async, non-blocking)
        if (isPasswordMatch) {
          setTimeout(async () => {
            try {
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(normalizedPassword, salt);
              await User.updateOne({ _id: user._id }, { password: hashedPassword });
              console.log('✅ Password has been hashed and saved');
            } catch (hashError) {
              console.error('⚠️ Error hashing password:', hashError.message);
            }
          }, 0);
        }
      }
    } catch (compareError) {
      console.error('❌ Password comparison error:', compareError);
      console.error('❌ Error details:', {
        message: compareError.message,
        stack: compareError.stack
      });
      return res.status(500).json({ 
        message: 'Error during password verification',
        error: process.env.NODE_ENV === 'development' ? compareError.message : undefined
      });
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
      console.log('🔍 Password provided length:', normalizedPassword.length);
      console.log('🔍 Password hash in DB starts with:', user.password.substring(0, 20));
      console.log('🔍 Password is hashed:', isPasswordHashed);
      
      // Provide more helpful error message
      res.status(401).json({ 
        message: 'Invalid email or password',
        hint: 'Please check your email and password. Make sure there are no extra spaces.'
      });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Server error during login';
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation error: ' + error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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



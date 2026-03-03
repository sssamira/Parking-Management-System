import crypto from 'crypto';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getOrCreateStripeCustomer, attachPaymentMethod } from '../utils/payment.js';
import { sendEmail } from '../utils/sendEmail.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }
  return new OAuth2Client(clientId, process.env.GOOGLE_CLIENT_SECRET);
};
let googleClient;
const ensureGoogleClient = () => {
  if (!googleClient && process.env.GOOGLE_CLIENT_ID) {
    googleClient = getGoogleClient();
  }
  return googleClient;
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
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ User created:', user.email);
      }
      
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        driverLicense: user.driverLicense,
        address: user.address,
        vehicles: user.vehicles,
        authProvider: user.authProvider,
        profileImage: user.profileImage,
        role: user.role,
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

    // Validate input - check if email and password exist
    if (!email || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: 'Password is required' });
    }

    console.log('🔐 Login attempt for email:', email);
    console.log('🔐 Password received (length):', password ? password.length : 0);

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPassword = password.trim();

    // CHECK FOR HARDCODED ADMIN FIRST
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (adminEmail && adminPassword && 
        normalizedEmail === adminEmail && 
        normalizedPassword === adminPassword) {
      
      
      // Create virtual admin user object
      const adminUser = {
        _id: 'admin_hardcoded',
        name: 'System Administrator',
        email: adminEmail,
        phone: 'N/A',
        driverLicense: 'N/A',
        address: 'N/A',
        vehicles: [],
        role: 'admin',
      };

      // Generate token with admin role
      const token = jwt.sign(
        { id: 'admin_hardcoded', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      return res.json({
        token,
        user: adminUser,
        message: 'Admin login successful',
      });
    }

    // If not admin, proceed with normal user login
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const enteredPassword = password;

    // Check if user exists and get password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log('❌ User not found:', normalizedEmail);
      // Debug: Check if there are any users at all
      const allUsers = await User.find({}).select('email');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    
    // Check if password field exists
    if (!user.password) {
      console.log('❌ Password field is missing or null');
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isPasswordHashed = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'));
    
    // Use normalizedPassword that was already declared above
    // Check password
    let isPasswordMatch = false;
    
    try {
      if (isPasswordHashed) {
        // Password is hashed, use bcrypt comparison
        
        // Try the model method first
        isPasswordMatch = await user.matchPassword(normalizedPassword);
        
        // If model method fails, try direct bcrypt
        if (!isPasswordMatch) {
          isPasswordMatch = await bcrypt.compare(normalizedPassword, user.password);
        }
      } else {
        // Password is NOT hashed (stored as plain text) - security issue but handle it
        console.log('⚠️ WARNING: Password stored as plain text!');
        isPasswordMatch = normalizedPassword === user.password.trim();
        
        // If matches, hash it for future use (async, non-blocking)
        if (isPasswordMatch) {
          setTimeout(async () => {
            try {
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(normalizedPassword, salt);
              await User.updateOne({ _id: user._id }, { password: hashedPassword });
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
          authProvider: user.authProvider,
          profileImage: user.profileImage,
        },
        message: 'Login successful',
      });
    } else {
      console.log('❌ Invalid password for:', user.email);
      
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

// @desc    Forgot password - send reset link to email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail, authProvider: 'local' })
      .select('+password +resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Password Reset - Parking Management',
      html: `
        <p>Hello ${user.name || 'User'},</p>
        <p>You requested a password reset. Click the link below to set a new password (valid for 1 hour):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
      text: `Password reset link (valid for 1 hour): ${resetUrl}`,
    });

    if (!emailResult.success && process.env.NODE_ENV === 'development') {
      console.log('[forgot-password] SMTP not configured. Reset link:', resetUrl);
    }

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.trim().length < 6) {
      return res.status(400).json({
        message: 'Token and a new password (at least 6 characters) are required.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new password reset.' });
    }

    user.password = password.trim();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
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
      authProvider: user.authProvider,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      hasPaymentMethod: user.hasPaymentMethod,
      paymentMethodLast4: user.paymentMethodLast4,
      paymentMethodBrand: user.paymentMethodBrand,
      paymentMethodExpMonth: user.paymentMethodExpMonth,
      paymentMethodExpYear: user.paymentMethodExpYear,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Save payment method for user
// @route   POST /api/auth/payment-method
// @access  Private
export const savePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    
    console.log('\n💳 ========== SAVE PAYMENT METHOD REQUEST ==========');
    console.log(`   Payment Method ID: ${paymentMethodId}`);
    console.log(`   User ID: ${req.user._id}`);
    
    if (!paymentMethodId) {
      console.error('❌ Payment method ID is missing');
      return res.status(400).json({ message: 'Payment method ID is required' });
    }

    // Validate payment method ID format
    if (!paymentMethodId.startsWith('pm_')) {
      console.error('❌ Invalid payment method ID format:', paymentMethodId);
      return res.status(400).json({ message: 'Invalid payment method ID format. Please try entering your card details again.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('❌ User not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`   User email: ${user.email}`);
    console.log(`   Existing stripeCustomerId: ${user.stripeCustomerId || 'NONE'}`);

    // Get or create Stripe customer
    console.log('🔍 Getting or creating Stripe customer...');
    const customer = await getOrCreateStripeCustomer(user);
    console.log(`✅ Stripe customer: ${customer.id}`);
    
    // Update user with Stripe customer ID if not already set
    if (!user.stripeCustomerId) {
      user.stripeCustomerId = customer.id;
      console.log(`✅ Updated user with Stripe customer ID`);
    }

    // Attach payment method to customer
    console.log('🔗 Attaching payment method to customer...');
    const paymentMethodDetails = await attachPaymentMethod(customer.id, paymentMethodId);
    console.log(`✅ Payment method attached successfully`);

    // Update user with payment method details
    user.paymentMethodId = paymentMethodDetails.id;
    user.paymentMethodLast4 = paymentMethodDetails.last4;
    user.paymentMethodBrand = paymentMethodDetails.brand;
    user.paymentMethodExpMonth = paymentMethodDetails.expMonth;
    user.paymentMethodExpYear = paymentMethodDetails.expYear;
    user.hasPaymentMethod = true;

    await user.save();

    console.log(`✅ Payment method saved successfully for user ${user._id}`);
    console.log(`   Card: ${paymentMethodDetails.brand} ending in ${paymentMethodDetails.last4}`);
    console.log(`   Expires: ${paymentMethodDetails.expMonth}/${paymentMethodDetails.expYear}`);
    console.log(`   ✅ This card will be automatically charged when exiting parking spots`);

    return res.status(200).json({
      message: 'Payment method saved successfully',
      paymentMethod: {
        last4: user.paymentMethodLast4,
        brand: user.paymentMethodBrand,
        expMonth: user.paymentMethodExpMonth,
        expYear: user.paymentMethodExpYear,
      },
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    
    // Determine appropriate HTTP status code
    let statusCode = 500;
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      statusCode = 400; // Bad request - payment method not found
    } else if (error.type === 'StripeCardError') {
      statusCode = 400; // Bad request - card error
    }
    
    // Provide more detailed error messages
    let errorMessage = 'Error saving payment method';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Payment method not found. Please make sure your Stripe keys are configured correctly and try entering your card details again.';
      } else {
      errorMessage = 'Invalid payment method. Please check your card details.';
      }
    } else if (error.type === 'StripeCardError') {
      errorMessage = 'Card error: ' + (error.message || 'Please check your card details.');
    }
    
    // Log the full error for debugging
    console.error('❌ Full error object:', JSON.stringify({
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      rawType: error.rawType,
      rawCode: error.rawCode,
    }, null, 2));
    
    return res.status(statusCode).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        type: error.type,
        code: error.code,
      } : undefined,
    });
  }
};

// @desc    Remove payment method from user
// @route   DELETE /api/auth/payment-method
// @access  Private
export const removePaymentMethod = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear payment method details
    user.paymentMethodId = null;
    user.paymentMethodLast4 = null;
    user.paymentMethodBrand = null;
    user.paymentMethodExpMonth = null;
    user.paymentMethodExpYear = null;
    user.hasPaymentMethod = false;

    await user.save();

    return res.status(200).json({
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    return res.status(500).json({
      message: 'Error removing payment method',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Sign in/up with Google
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('Google client ID is not configured');
      return res.status(500).json({ message: 'Google auth is not configured on the server' });
    }

    const client = ensureGoogleClient();
    if (!client) {
      return res.status(500).json({ message: 'Google auth client could not be initialized' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('❌ Google credential verification failed:', verifyError);
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    if (!payload) {
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    const {
      sub: googleId,
      email,
      name,
      picture,
      given_name: givenName,
      family_name: familyName,
    } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account does not have a verified email' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const displayName = name || `${givenName || ''} ${familyName || ''}`.trim() || 'Google User';

    let user = await User.findOne({
      $or: [
        { googleId },
        { email: normalizedEmail },
      ],
    }).select('+password');

    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        name: displayName,
        email: normalizedEmail,
        authProvider: 'google',
        googleId,
        profileImage: picture || '',
        phone: '',
        driverLicense: '',
        address: '',
        vehicles: [],
        lastGooglePayload: payload,
      });
    } else {
      let shouldSave = false;

      if (!user.googleId && googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }

      if (!user.profileImage && picture) {
        user.profileImage = picture;
        shouldSave = true;
      }

      if (user.authProvider !== 'google' && !user.password) {
        user.authProvider = 'google';
        shouldSave = true;
      }

      user.lastGooglePayload = payload;
      if (shouldSave) {
        await user.save();
      } else {
        await user.updateOne({ lastGooglePayload: payload });
      }
    }

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
        authProvider: user.authProvider,
        profileImage: user.profileImage,
      },
      isNewUser,
      message: isNewUser ? 'Google account created successfully' : 'Login successful',
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({
      message: 'Server error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};



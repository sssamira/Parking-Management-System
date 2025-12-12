import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Account Information
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: [function () { return this.authProvider === 'local'; }, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      required: [function () { return this.authProvider === 'local'; }, 'Please provide your phone number'],
      trim: true,
      default: '',
    },
    
    // Driver Details
    driverLicense: {
      type: String,
      required: [function () { return this.authProvider === 'local'; }, 'Please provide your driver license number'],
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: [function () { return this.authProvider === 'local'; }, 'Please provide your address'],
      trim: true,
      default: '',
    },
    
    // Vehicle Details - Array of vehicles (optional for social logins)
    vehicles: {
      type: [
        {
          licensePlate: {
            type: String,
            required: [true, 'Please provide your vehicle license plate'],
            uppercase: true,
            trim: true,
          },
          carType: {
            type: String,
            required: [true, 'Please provide your car type'],
            enum: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Motorcycle', 'Other'],
            trim: true,
          },
          carModel: {
            type: String,
            required: [true, 'Please provide your car model'],
            trim: true,
          },
          carColor: {
            type: String,
            required: [true, 'Please provide your car color'],
            trim: true,
          },
          carYear: {
            type: Number,
            required: [true, 'Please provide your car year'],
            min: [1900, 'Invalid car year'],
            max: [new Date().getFullYear() + 1, 'Invalid car year'],
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    // Track last Google login payload to help debugging (optional)
    lastGooglePayload: {
      type: Object,
      select: false,
    },
    
    // Search Queries - Store booking search details
    searchQueries: [{
      parkingLotName: {
        type: String,
        trim: true
      },
      vehicleType: {
        type: String,
        enum: ['Car', 'Bike', 'All', ''],
        default: ''
      },
      date: {
        type: Date
      },
      startTime: {
        type: Date
      },
      endTime: {
        type: Date
      },
      carModel: {
        type: String,
        trim: true
      },
      driverName: {
        type: String,
        trim: true
      },
      licenseNumber: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified and not already hashed
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  const isAlreadyHashed = this.password && (
    this.password.startsWith('$2a$') || 
    this.password.startsWith('$2b$') || 
    this.password.startsWith('$2y$')
  );
  
  if (isAlreadyHashed) {
    // Password is already hashed, don't hash again
    return next();
  }
  
  // Trim password before hashing to ensure consistency
  const trimmedPassword = this.password.trim();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(trimmedPassword, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    console.error('❌ Password field is missing in user object');
    return false;
  }
  if (!enteredPassword) {
    console.error('❌ Entered password is missing');
    return false;
  }
  try {
    const result = await bcrypt.compare(enteredPassword, this.password);
    return result;
  } catch (error) {
    console.error('❌ Bcrypt compare error:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

export default User;



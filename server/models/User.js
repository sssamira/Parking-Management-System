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
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      required: [true, 'Please provide your phone number'],
      trim: true,
    },
    
    // Driver Details
    driverLicense: {
      type: String,
      required: [true, 'Please provide your driver license number'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide your address'],
      trim: true,
    },
    
    // Vehicle Details
    vehicle: {
      licensePlate: {
        type: String,
        required: [true, 'Please provide your vehicle license plate'],
        uppercase: true,
        trim: true,
        unique: true,
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
    },
    
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
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;


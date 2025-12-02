import User from '../models/User.js';

// @desc    Add a new vehicle to user account
// @route   POST /api/vehicles
// @access  Private
export const addVehicle = async (req, res) => {
  try {
    const { licensePlate, carType, carModel, carColor, carYear } = req.body;

    // Check if license plate already exists for any user
    const existingVehicle = await User.findOne({
      'vehicles.licensePlate': licensePlate.toUpperCase()
    });

    if (existingVehicle) {
      return res.status(400).json({ 
        message: 'Vehicle with this license plate already registered' 
      });
    }

    // Check if user already has this license plate
    const user = await User.findById(req.user._id);
    const hasVehicle = user.vehicles.some(
      v => v.licensePlate === licensePlate.toUpperCase()
    );

    if (hasVehicle) {
      return res.status(400).json({ 
        message: 'You already have a vehicle with this license plate' 
      });
    }

    // Add vehicle to user's vehicles array
    user.vehicles.push({
      licensePlate: licensePlate.toUpperCase(),
      carType,
      carModel,
      carColor,
      carYear,
    });

    await user.save();

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: user.vehicles[user.vehicles.length - 1],
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error while adding vehicle' });
  }
};

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:vehicleId
// @access  Private
export const updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { licensePlate, carType, carModel, carColor, carYear } = req.body;

    const user = await User.findById(req.user._id);
    const vehicle = user.vehicles.id(vehicleId);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if license plate is being changed and if it already exists
    if (licensePlate && licensePlate.toUpperCase() !== vehicle.licensePlate) {
      const existingVehicle = await User.findOne({
        'vehicles.licensePlate': licensePlate.toUpperCase(),
        _id: { $ne: req.user._id }
      });

      if (existingVehicle) {
        return res.status(400).json({ 
          message: 'Vehicle with this license plate already registered' 
        });
      }
    }

    // Update vehicle fields
    if (licensePlate) vehicle.licensePlate = licensePlate.toUpperCase();
    if (carType) vehicle.carType = carType;
    if (carModel) vehicle.carModel = carModel;
    if (carColor) vehicle.carColor = carColor;
    if (carYear) vehicle.carYear = carYear;

    await user.save();

    res.json({
      message: 'Vehicle updated successfully',
      vehicle,
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Server error while updating vehicle' });
  }
};

// @desc    Delete a vehicle
// @route   DELETE /api/vehicles/:vehicleId
// @access  Private
export const deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const user = await User.findById(req.user._id);
    const vehicle = user.vehicles.id(vehicleId);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Don't allow deleting if it's the only vehicle
    if (user.vehicles.length === 1) {
      return res.status(400).json({ 
        message: 'Cannot delete your only vehicle. You must have at least one vehicle.' 
      });
    }

    vehicle.deleteOne();
    await user.save();

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: 'Server error while deleting vehicle' });
  }
};

// @desc    Get all vehicles for current user
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ vehicles: user.vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ message: 'Server error while fetching vehicles' });
  }
};


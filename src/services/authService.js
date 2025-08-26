const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const payload = { userId, type: 'access' };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

const verifyAccessToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    const user = await User.findById(decoded.userId).select('-__v');
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    return { user, decoded };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    return { user, decoded };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const { user } = await verifyRefreshToken(refreshToken);
    const { accessToken } = generateTokens(user._id);
    
    return { accessToken };
  } catch (error) {
    throw error;
  }
};

const findOrCreateUser = async (email, userData = {}) => {
  try {
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        email,
        isEmailVerified: true,
        ...userData
      });
      await user.save();
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    return user;
  } catch (error) {
    throw new Error('Failed to find or create user');
  }
};

const handleFailedLogin = async (email) => {
  try {
    const user = await User.findOne({ email });
    
    if (user) {
      await user.incrementLoginAttempts();
    }
  } catch (error) {
    console.error('Failed login handling error:', error);
  }
};

const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  // Remove sensitive fields
  const { __v, loginAttempts, lockUntil, ...sanitized } = userObj;
  
  // Add computed fields
  sanitized.fullName = user.fullName;
  sanitized.isLocked = user.isLocked;
  
  return sanitized;
};

const updateUserProfile = async (userId, updates) => {
  try {
    const allowedUpdates = ['name', 'profile'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'profile') {
          // Merge profile updates
          filteredUpdates['profile'] = { ...updates.profile };
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return sanitizeUser(user);
  } catch (error) {
    throw new Error('Failed to update profile: ' + error.message);
  }
};

const deactivateUser = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return { success: true, message: 'Account deactivated successfully' };
  } catch (error) {
    throw new Error('Failed to deactivate account');
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  findOrCreateUser,
  handleFailedLogin,
  sanitizeUser,
  updateUserProfile,
  deactivateUser
};
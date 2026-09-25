const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { getDbStatus } = require('../config/db');

const registerUser = async ({ name, email, password }) => {
  const dbStatus = getDbStatus();
  if (dbStatus.readyState !== 1) {
    throw new Error('Database service is currently unavailable. Please verify MONGODB_URI.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('A user with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const dbStatus = getDbStatus();
  if (dbStatus.readyState !== 1) {
    throw new Error('Database service is currently unavailable. Please verify MONGODB_URI.');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.toSafeObject();
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};

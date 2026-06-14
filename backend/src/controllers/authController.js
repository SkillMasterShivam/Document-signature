import jwt from "jsonwebtoken";
import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please add all fields: name, email, password",
    });
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  // Create user (password hashing is handled in pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token: generateToken(user._id),
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid user data",
    });
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide both email and password",
    });
  }

  // Find user by email
  const user = await User.findOne({ email });

  // Verify user exists and compare passwords
  if (user && (await user.matchPassword(password))) {
    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = catchAsync(async (req, res) => {
  // The user object is already attached to req.user by authMiddleware
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

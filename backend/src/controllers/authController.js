import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// In-Memory store for fallback
export const mockUsers = [];

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Helper to check database connection status
const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please add all fields: name, email, password",
    });
  }

  try {
    if (isDbConnected()) {
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
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid user data",
        });
      }
    } else {
      // Mock / In-memory fallback
      console.log("[Mock Mode] Registering user:", email);
      const normalizedEmail = email.toLowerCase().trim();
      const userExists = mockUsers.find((u) => u.email === normalizedEmail);

      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email (Mock)",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const mockUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        name,
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsers.push(mockUser);

      return res.status(201).json({
        success: true,
        message: "User registered successfully (Mock)",
        user: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide both email and password",
    });
  }

  try {
    if (isDbConnected()) {
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
    } else {
      // Mock / In-memory fallback
      console.log("[Mock Mode] Logging in user:", email);
      const normalizedEmail = email.toLowerCase().trim();
      const user = mockUsers.find((u) => u.email === normalizedEmail);

      if (user && (await bcrypt.compare(password, user.password))) {
        return res.status(200).json({
          success: true,
          message: "Logged in successfully (Mock)",
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
          message: "Invalid email or password (Mock)",
        });
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  // The user object is already attached to req.user by authMiddleware
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { mockUsers } from "../controllers/authController.js";

const authMiddleware = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const isDbConnected = mongoose.connection.readyState === 1;

      if (isDbConnected) {
        // Get user from the token, exclude password
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Not authorized, user not found",
          });
        }

        req.user = user;
      } else {
        // Mock / In-memory fallback lookup
        const user = mockUsers.find((u) => u._id === decoded.id);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Not authorized, user not found (Mock)",
          });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided or invalid format",
    });
  }
};

export default authMiddleware;

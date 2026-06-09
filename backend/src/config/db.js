import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${process.env.MONGODB_URI}...`);
    // Connect with a short timeout to fail fast if not running
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Database Connection Error (Running in Mock Fallback Mode):", error.message);
    // Keep server running so APIs can be tested with in-memory fallback
  }
};

export default connectDB;
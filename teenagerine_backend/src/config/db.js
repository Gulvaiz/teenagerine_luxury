const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Force IPv4 for localhost to avoid ::1 connection issues
    const uri = process.env.MONGO_URI.replace('localhost', '127.0.0.1');
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("💡 Tip: Make sure MongoDB is running locally on port 27017!");
    process.exit(1);
  }
};

module.exports = connectDB;

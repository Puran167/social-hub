const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Please check:\n  1. Your MONGODB_URI in .env\n  2. Your IP is whitelisted in Atlas Network Access\n  3. Your cluster is active (not paused)');
    process.exit(1);
  }
};

module.exports = connectDB;

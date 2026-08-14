const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB(retries = 3, delayMs = 1500) {
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const db = await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      isConnected = db.connections[0].readyState === 1;
      console.log("✅ Successfully connected to MongoDB Atlas!");
      return;
    } catch (error) {
      console.warn(`⚠️ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error("❌ All MongoDB connection attempts failed.");
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = connectDB;

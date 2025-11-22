const mongoose = require("mongoose");
const { logActivity } = require("../services/log.service");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");

    await logActivity(null, "SYSTEM_DB_CONNECTED", {
      uriConfigured: Boolean(process.env.MONGODB_URI),
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

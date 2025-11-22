const AuditLog = require("../models/auditLog.model");
const { encrypt } = require("./encryption.service");

const logActivity = async (userId, action, details = {}) => {
  try {
    const logData = {
      userId,
      action,
      details,
      timestamp: new Date(),
    };

    const logString = JSON.stringify(logData);
    const { iv, encryptedData } = encrypt(logString);

    const newLog = new AuditLog({
      iv,
      encryptedData,
    });

    await newLog.save();
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

module.exports = { logActivity };

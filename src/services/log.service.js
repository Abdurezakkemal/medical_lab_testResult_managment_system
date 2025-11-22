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

const logRequestActivity = async (req, userId, action, details = {}) => {
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    (req.connection && req.connection.remoteAddress) ||
    null;

  const userAgent = req.headers["user-agent"] || null;

  const requestMeta = {
    ip,
    userAgent,
    path: req.originalUrl,
    method: req.method,
  };

  return logActivity(userId, action, {
    ...details,
    request: requestMeta,
  });
};

module.exports = { logActivity, logRequestActivity };

const { logRequestActivity } = require("../services/log.service");

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  try {
    const userId = req && req.user && req.user.id ? req.user.id : null;
    if (req) {
      logRequestActivity(req, userId, "UNHANDLED_ERROR", {
        message: err.message,
      });
    }
  } catch (logError) {
    console.error("Failed to log error via audit log:", logError.message);
  }

  res.status(500).send("Server Error");
};

module.exports = errorHandler;

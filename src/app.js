require("./config");
const express = require("express");
const errorHandler = require("./middleware/error.handler");
const cookieParser = require("cookie-parser");
const securityMiddleware = require("./middleware/security.middleware");
const app = express();

// Middleware
app.use(securityMiddleware);
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use("/api/v1/auth", require("./api/v1/auth.routes"));
app.use("/api/v1/users", require("./api/v1/user.routes"));
app.use("/api/v1/tests", require("./api/v1/test.routes"));
app.use("/api/v1/audit-logs", require("./api/v1/audit.routes"));

// Basic route
app.get("/", (req, res) => {
  res.send("Secure Medical Lab API is running...");
});

app.use(errorHandler);

module.exports = app;

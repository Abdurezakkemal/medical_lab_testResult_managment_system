require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const seedRoles = require("./config/seed");
const { logActivity } = require("./services/log.service");

// Connect to database and then seed roles
const startServer = async () => {
  await connectDB();
  await seedRoles();
};

startServer();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  logActivity(null, "SYSTEM_SERVER_STARTED", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
  });
});

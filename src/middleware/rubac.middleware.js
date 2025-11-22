const User = require("../models/user.model");
const Role = require("../models/role.model");

const rubacMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isLabTech = user.roles.some((role) => role.name === "Lab Tech");

    if (isLabTech) {
      const currentHour = new Date().getHours();
      // Rule: Deny access outside of 9 AM (09) to 5 PM (17)
      if (currentHour < 9 || currentHour >= 17) {
        return res.status(403).json({
          message: "Forbidden: Access is restricted during non-working hours.",
        });
      } else {
        // Allow access during working hours
        next();
      }
    } else {
      // Non-Lab Tech users are not affected by this middleware
      next();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

module.exports = rubacMiddleware;

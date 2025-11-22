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
      // Rule: Deny access between 10 PM (22) and 6 AM (06)
      if (currentHour >= 22 || currentHour < 6) {
        return res
          .status(403)
          .json({
            message:
              "Forbidden: Access is restricted during non-working hours.",
          });
      }
    }

    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

module.exports = rubacMiddleware;

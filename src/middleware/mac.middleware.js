const User = require("../models/user.model");
const TestResult = require("../models/testResult.model");

const macMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    // MAC check: User's clearance level must be >= resource's sensitivity level
    if (user.clearanceLevel < testResult.sensitivityLevel) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient security clearance" });
    }

    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

module.exports = macMiddleware;

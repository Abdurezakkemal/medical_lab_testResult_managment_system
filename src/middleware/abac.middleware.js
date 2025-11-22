const User = require("../models/user.model");
const TestResult = require("../models/testResult.model");

const abacMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    // ABAC check: User's department must match the test result's department
    if (user.attributes.department !== testResult.department) {
      return res
        .status(403)
        .json({
          message:
            "Forbidden: You do not have access to this department's records",
        });
    }

    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

module.exports = abacMiddleware;

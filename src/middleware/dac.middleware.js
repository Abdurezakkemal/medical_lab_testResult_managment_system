const TestResult = require("../models/testResult.model");

const dacMiddleware = async (req, res, next) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    const userId = req.user.id;

    // DAC check: Is the user the owner or has the result been shared with them?
    const isOwner = testResult.owner.toString() === userId;
    const isSharedWith = testResult.sharedWith.some(
      (share) => share.userId.toString() === userId
    );

    if (isOwner || isSharedWith) {
      // If DAC passes, we can bypass other checks like ABAC.
      // We will set a flag on the request object to indicate this.
      req.bypassAbac = true;
    }

    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

module.exports = dacMiddleware;

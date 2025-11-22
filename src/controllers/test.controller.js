const TestResult = require("../models/testResult.model");
const { logActivity } = require("../services/log.service");

// @desc    Lab Tech test route for uploading results
exports.uploadResult = (req, res) => {
  res.json({ message: "Access granted: You can upload results at this time." });
};

// @desc    Create a new test result
exports.createTestResult = async (req, res) => {
  const { patientId, testName, resultData, sensitivityLevel, department } =
    req.body;

  try {
    const newTestResult = new TestResult({
      patientId,
      testName,
      resultData,
      sensitivityLevel,
      department,
      owner: req.user.id,
      uploadedBy: req.user.id,
    });

    const testResult = await newTestResult.save();

    // Log the event
    await logActivity(req.user.id, "CREATE_TEST_RESULT", {
      resultId: testResult._id,
      patientId,
    });

    res.json(testResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Share a test result with another user
exports.shareTestResult = async (req, res) => {
  const { userIdToShareWith, permissions } = req.body;

  try {
    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    // Only the owner can share the result
    if (testResult.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: Only the owner can share this result" });
    }

    // Add the user to the sharedWith array
    testResult.sharedWith.push({ userId: userIdToShareWith, permissions });
    await testResult.save();

    // Log the event
    await logActivity(req.user.id, "SHARE_TEST_RESULT", {
      resultId: testResult._id,
      sharedWith: userIdToShareWith,
    });

    res.json({ message: "Test result shared successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get a specific test result
exports.getTestResult = async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    // The middleware has already performed the MAC check
    res.json(testResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

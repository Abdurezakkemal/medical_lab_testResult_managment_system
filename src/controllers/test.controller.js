const TestResult = require("../models/testResult.model");
const { logRequestActivity } = require("../services/log.service");

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
    await logRequestActivity(req, req.user.id, "CREATE_TEST_RESULT", {
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
    await logRequestActivity(req, req.user.id, "SHARE_TEST_RESULT", {
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
    if (testResult && req.user && req.user.id) {
      await logRequestActivity(req, req.user.id, "VIEW_TEST_RESULT", {
        resultId: testResult._id,
        patientId: testResult.patientId,
      });
    }

    res.json(testResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get all test results (Admin only via RBAC)
exports.getAllTestResults = async (req, res) => {
  try {
    const results = await TestResult.find();
    if (req.user && req.user.id) {
      await logRequestActivity(req, req.user.id, "VIEW_ALL_TEST_RESULTS", {
        count: results.length,
      });
    }

    res.json(results);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update a test result (owner or shared-with with write permission)
exports.updateTestResult = async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    const userId = req.user.id;
    const isOwner = testResult.owner.toString() === userId;
    const hasWriteAccess = testResult.sharedWith.some(
      (share) =>
        share.userId.toString() === userId &&
        Array.isArray(share.permissions) &&
        share.permissions.includes("write")
    );

    if (!isOwner && !hasWriteAccess) {
      return res.status(403).json({
        message:
          "Forbidden: Only the owner or users with write access can update this result",
      });
    }

    const { testName, resultData, sensitivityLevel, department } = req.body;

    if (typeof testName !== "undefined") testResult.testName = testName;
    if (typeof resultData !== "undefined") testResult.resultData = resultData;
    if (typeof sensitivityLevel !== "undefined")
      testResult.sensitivityLevel = sensitivityLevel;
    if (typeof department !== "undefined") testResult.department = department;

    const updated = await testResult.save();

    await logRequestActivity(req, req.user.id, "UPDATE_TEST_RESULT", {
      resultId: updated._id,
    });

    res.json(updated);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete a test result (owner only)
exports.deleteTestResult = async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    if (testResult.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden: Only the owner can delete this result",
      });
    }

    await testResult.deleteOne();

    await logRequestActivity(req, req.user.id, "DELETE_TEST_RESULT", {
      resultId: testResult._id,
    });

    res.json({ message: "Test result deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

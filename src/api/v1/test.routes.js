const express = require("express");
const router = express.Router();
const testController = require("../../controllers/test.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const rbacMiddleware = require("../../middleware/rbac.middleware");
const rubacMiddleware = require("../../middleware/rubac.middleware");
const macMiddleware = require("../../middleware/mac.middleware");
const abacMiddleware = require("../../middleware/abac.middleware");
const dacMiddleware = require("../../middleware/dac.middleware");

// @route   POST /api/v1/tests
// @desc    Create a new test result
// @access  Private (Doctor)
router.post(
  "/",
  authMiddleware,
  rbacMiddleware(["create_report"]),
  testController.createTestResult
);

// @route   GET /api/v1/tests/:id
// @desc    Get a specific test result
// @access  Private (MAC enforced)
router.get(
  "/:id",
  authMiddleware,
  macMiddleware,
  dacMiddleware, // DAC runs before ABAC
  (req, res, next) => {
    // This function conditionally skips ABAC
    if (req.bypassAbac) {
      return next();
    }
    abacMiddleware(req, res, next);
  },
  testController.getTestResult
);

// @route   POST /api/v1/tests/upload
// @desc    Lab Tech test route for uploading results
// @access  Private (Lab Tech)
router.post(
  "/upload",
  authMiddleware,
  rbacMiddleware(["upload_results"]),
  rubacMiddleware,
  testController.uploadResult
);

module.exports = router;

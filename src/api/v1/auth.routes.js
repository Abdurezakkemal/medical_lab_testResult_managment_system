const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const {
  validate,
  registerSchema,
} = require("../../middleware/validation.middleware");

// @route   POST /api/v1/auth/mfa/setup
// @desc    Set up MFA for the authenticated user
// @access  Private
router.post("/mfa/setup", authMiddleware, authController.setupMfa);

// @route   POST /api/v1/auth/mfa/verify
// @desc    Verify the MFA token and enable MFA
// @access  Private
router.post("/mfa/verify", authMiddleware, authController.verifyMfa);

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validate(registerSchema), authController.register);

// @route   POST /api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", authController.login);

module.exports = router;

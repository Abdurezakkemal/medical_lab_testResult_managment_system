const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const {
  validate,
  registerSchema,
} = require("../../middleware/validation.middleware");
const verifyCaptcha = require("../../middleware/captcha.middleware");

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
router.post(
  "/register",
  verifyCaptcha,
  validate(registerSchema),
  authController.register
);

// @route   GET /api/v1/auth/verifyemail/:token
// @desc    Verify user's email
// @access  Public
router.get("/verifyemail/:token", authController.verifyEmail);

// @route   POST /api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", verifyCaptcha, authController.login);

module.exports = router;

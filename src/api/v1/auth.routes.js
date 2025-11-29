const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const {
  validate,
  registerSchema,
  changePasswordSchema,
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
router.post("/register", validate(registerSchema), authController.register);

// @route   GET /api/v1/auth/verifyemail/:token
// @desc    Verify user's email
// @access  Publics
router.get("/verifyemail/:token", authController.verifyEmail);

// @route   POST /api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", authController.login);

// @route   POST /api/v1/auth/change-password
// @desc    Change password for the authenticated user
// @access  Private
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword
);

// @route   POST /api/v1/auth/login/mfa/verify
// @desc    Verify the MFA token during login
// @access  Private (requires a temporary MFA token)
router.post("/login/mfa/verify", authMiddleware, authController.loginVerifyMfa);

// @route   GET /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public (but requires a valid refresh token cookie)
router.get("/refresh", authController.refreshToken);

// @route   GET /api/v1/auth/logout
// @desc    Logout user
// @access  Public
router.get("/logout", authController.logout);

module.exports = router;

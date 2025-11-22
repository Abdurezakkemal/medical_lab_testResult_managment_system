const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const rbacMiddleware = require("../../middleware/rbac.middleware");

// @route   GET /api/v1/users/admin
// @desc    Admin-only test route
// @access  Private (Admin)
router.get(
  "/admin",
  authMiddleware,
  rbacMiddleware(["manage_roles"]),
  userController.adminTest
);

module.exports = router;

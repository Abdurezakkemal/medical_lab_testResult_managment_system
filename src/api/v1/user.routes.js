const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const rbac = require("../../middleware/rbac.middleware");

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private (Admin)
router.get("/", authMiddleware, rbac(["Admin"]), userController.getAllUsers);

// @route   GET /api/v1/users/:id
// @desc    Get user by ID
// @access  Private (Admin, Doctor)
router.get(
  "/:id",
  authMiddleware,
  rbac(["Admin", "Doctor"]),
  userController.getUserById
);

router.patch(
  "/:id/roles",
  authMiddleware,
  rbac(["Admin"]),
  userController.updateUserRoles
);

router.patch(
  "/:id/lock",
  authMiddleware,
  rbac(["Admin"]),
  userController.updateUserLockStatus
);

module.exports = router;

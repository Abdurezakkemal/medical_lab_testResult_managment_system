const express = require("express");
const router = express.Router();
const auditController = require("../../controllers/audit.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const rbac = require("../../middleware/rbac.middleware");

// @route   GET /api/v1/audit-logs
// @desc    Get decrypted audit logs
// @access  Private (Admin)
router.get("/", authMiddleware, rbac(["Admin"]), auditController.getAuditLogs);

module.exports = router;

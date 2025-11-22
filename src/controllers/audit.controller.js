const AuditLog = require("../models/auditLog.model");
const { decrypt } = require("../services/encryption.service");

// Get decrypted audit logs (Admin-only via RBAC on the route)
exports.getAuditLogs = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;

    const { userId, action, from, to } = req.query;

    const logs = await AuditLog.find().sort({ createdAt: -1 });

    const parsed = logs.map((log) => {
      let payload;
      try {
        const decrypted = decrypt({
          iv: log.iv,
          encryptedData: log.encryptedData,
        });
        payload = JSON.parse(decrypted);
      } catch (error) {
        payload = { parseError: "Failed to decrypt log payload" };
      }

      return {
        _id: log._id,
        ...payload,
        createdAt: log.createdAt,
      };
    });

    let filtered = parsed;

    if (userId) {
      filtered = filtered.filter((log) => log.userId === userId);
    }

    if (action) {
      filtered = filtered.filter((log) => log.action === action);
    }

    let fromDate;
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) {
        fromDate = d;
      }
    }

    let toDate;
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        toDate = d;
      }
    }

    if (fromDate) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const ts = new Date(log.timestamp);
        if (Number.isNaN(ts.getTime())) return false;
        return ts >= fromDate;
      });
    }

    if (toDate) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const ts = new Date(log.timestamp);
        if (Number.isNaN(ts.getTime())) return false;
        return ts <= toDate;
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);

    res.json({ page, limit, total, totalPages, data });
  } catch (error) {
    console.error("Error fetching audit logs:", error.message);
    res.status(500).send("Server error");
  }
};

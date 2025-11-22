const User = require("../models/user.model");
const Role = require("../models/role.model");

const rbac = (allowed) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).populate("roles");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userRoles = user.roles.map((role) => role.name);
      const userPermissions = user.roles.reduce(
        (perms, role) => perms.concat(role.permissions || []),
        []
      );

      const hasRequiredAccess =
        userRoles.some((role) => allowed.includes(role)) ||
        userPermissions.some((perm) => allowed.includes(perm));

      if (hasRequiredAccess) {
        next();
      } else {
        res
          .status(403)
          .json({ message: "Forbidden: You do not have the required role." });
      }
    } catch (error) {
      console.error("RBAC error:", error.message);
      res.status(500).send("Server error during role verification");
    }
  };
};

module.exports = rbac;

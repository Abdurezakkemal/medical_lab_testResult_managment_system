const User = require("../models/user.model");
const Role = require("../models/role.model");

const rbacMiddleware = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).populate("roles");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userPermissions = user.roles.flatMap((role) => role.permissions);

      const hasPermission = requiredPermissions.every((p) =>
        userPermissions.includes(p)
      );

      if (hasPermission) {
        next();
      } else {
        res
          .status(403)
          .json({
            message: "Forbidden: You do not have the required permissions",
          });
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server error");
    }
  };
};

module.exports = rbacMiddleware;

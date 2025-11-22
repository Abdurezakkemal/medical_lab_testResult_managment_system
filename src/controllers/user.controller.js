const User = require("../models/user.model");
const Role = require("../models/role.model");
const { logRequestActivity } = require("../services/log.service");

// @desc    Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    if (req.user && req.user.id) {
      await logRequestActivity(req, req.user.id, "VIEW_ALL_USERS", {
        count: users.length,
      });
    }

    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.updateUserRoles = async (req, res) => {
  try {
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: "Roles array is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleDocs = await Role.find({ name: { $in: roles } });
    if (roleDocs.length !== roles.length) {
      return res.status(400).json({ message: "One or more roles are invalid" });
    }

    user.roles = roleDocs.map((role) => role._id);
    const updatedUser = await user.save();

    await logRequestActivity(req, req.user.id, "UPDATE_USER_ROLES", {
      targetUserId: updatedUser._id,
      roles,
    });

    const sanitizedUser = updatedUser.toObject();
    delete sanitizedUser.password;

    res.json(sanitizedUser);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.updateUserLockStatus = async (req, res) => {
  try {
    const { isLocked } = req.body;

    if (typeof isLocked !== "boolean") {
      return res.status(400).json({ message: "isLocked boolean is required" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isLocked = isLocked;
    const updatedUser = await user.save();

    await logRequestActivity(req, req.user.id, "UPDATE_USER_LOCK_STATUS", {
      targetUserId: updatedUser._id,
      isLocked,
    });

    const sanitizedUser = updatedUser.toObject();
    delete sanitizedUser.password;

    res.json(sanitizedUser);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.user && req.user.id) {
      await logRequestActivity(req, req.user.id, "VIEW_USER", {
        targetUserId: user._id,
      });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

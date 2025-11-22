const User = require("../models/user.model");
const Role = require("../models/role.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { logActivity } = require("../services/log.service");

// @desc    Set up MFA for the authenticated user
exports.setupMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    user.mfaSecret = secret.base32;
    await user.save();

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        throw new Error("Could not generate QR code");
      }
      res.json({ qrCodeUrl: data_url, secret: secret.base32 });
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Verify the MFA token and enable MFA
exports.verifyMfa = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token,
    });

    if (verified) {
      user.mfaEnabled = true;
      await user.save();
      res.json({ message: "MFA enabled successfully" });
    } else {
      res.status(400).json({ message: "Invalid MFA token" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Register a new user
exports.register = async (req, res) => {
  const { username, email, password, department } = req.body;

  try {
    console.log("Step 1: Checking if user exists...");
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log("Step 2: Finding default role...");
    const defaultRole = await Role.findOne({ name: "Patient" });
    if (!defaultRole) {
      // This should not happen if the seeder has run
      return res.status(500).json({ message: "Default role not found" });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      attributes: { department },
      roles: [defaultRole._id],
    });

    console.log("Step 3: Saving new user...");
    await user.save();

    console.log("Step 4: Logging registration event...");
    await logActivity(user.id, "USER_REGISTER", { email: user.email });
    console.log("Step 5: Registration complete.");

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Authenticate user & get token
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`[AUTH] Attempting login for ${email}.`);
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[AUTH] User not found: ${email}.`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log(
      `[AUTH] User found. isLocked: ${user.isLocked}, Attempts: ${user.loginAttempts}`
    );

    if (user.isLocked) {
      console.log(`[AUTH] Account is locked for ${email}. Denying access.`);
      return res
        .status(403)
        .json({
          message: "Account is locked. Please contact an administrator.",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log(`[AUTH] Password mismatch for ${email}.`);
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      console.log(
        `[AUTH] Incremented login attempts to ${user.loginAttempts} for ${email}.`
      );

      if (user.loginAttempts >= 5) {
        console.log(`[AUTH] Locking account for ${email}.`);
        user.isLocked = true;
      }

      await user.save();

      if (user.isLocked) {
        return res
          .status(403)
          .json({
            message: "Account is locked. Please contact an administrator.",
          });
      }

      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log(
      `[AUTH] Password match for ${email}. Resetting login attempts.`
    );
    user.loginAttempts = 0;
    await user.save();

    await logActivity(user.id, "USER_LOGIN", { email: user.email });

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

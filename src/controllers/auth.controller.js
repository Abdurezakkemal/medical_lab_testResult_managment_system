const User = require("../models/user.model");
const Role = require("../models/role.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto = require("crypto");
const { logRequestActivity } = require("../services/log.service");
const sendEmail = require("../services/email.service");
const { sendSecurityAlert } = require("../services/alert.service");

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

    await logRequestActivity(req, user.id, "MFA_SETUP_INITIATED", {
      email: user.email,
    });

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

// @desc    Verify the MFA token during login
exports.loginVerifyMfa = async (req, res) => {
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
      // MFA token is valid, complete the login process
      user.loginAttempts = 0;
      await user.save();

      const accessToken = jwt.sign(
        { user: { id: user.id } },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { user: { id: user.id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      await logRequestActivity(req, user.id, "MFA_LOGIN_COMPLETED", {
        email: user.email,
      });

      res.status(200).json({ accessToken });
    } else {
      res.status(400).json({ message: "Invalid MFA token" });
    }
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
      await logRequestActivity(req, user.id, "MFA_ENABLED", {
        email: user.email,
      });
      res.json({ message: "MFA enabled successfully" });
    } else {
      res.status(400).json({ message: "Invalid MFA token" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Verify user's email
exports.verifyEmail = async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    await logRequestActivity(req, user.id, "EMAIL_VERIFIED", {
      email: user.email,
    });

    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Register a new user
exports.register = async (req, res) => {
  const { username, email, password, department } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    let defaultRole = await Role.findOne({ name: "Patient" });
    if (!defaultRole) {
      // This should not happen if the seeder has run
      defaultRole = await Role.create({
        name: "Patient",
        permissions: ["read_own_data"],
      });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      attributes: { department },
      roles: [defaultRole._id],
    });

    await user.save();

    const verificationToken = user.generateEmailVerificationToken();

    // Send verification email
    const verificationUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/auth/verifyemail/${verificationToken}`;
    const message = `Please verify your email by clicking on the following link: ${verificationUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Email Verification",
        message,
      });

      // Save user after sending email
      await user.save({ validateBeforeSave: false });

      await logRequestActivity(req, user.id, "USER_REGISTERED", {
        email: user.email,
      });

      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
      });
    } catch (err) {
      console.error(err.message);
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpires = undefined;
      // Don't save user, let the transaction rollback or handle as needed
      return res.status(500).send("Email could not be sent.");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Logout user
exports.logout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No content

  const refreshToken = cookies.jwt;

  try {
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();

      await logRequestActivity(req, user.id, "USER_LOGOUT", {
        email: user.email,
      });
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.sendStatus(204);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Refresh access token
exports.refreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401);

  const refreshToken = cookies.jwt;

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.sendStatus(403);

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err || user.id !== decoded.user.id) return res.sendStatus(403);

        const accessToken = jwt.sign(
          { user: { id: decoded.user.id } },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );
        res.json({ accessToken });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// @desc    Authenticate user & get token
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isLocked) {
      return res.status(403).json({
        message: "Account is locked. Please contact an administrator.",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Account not verified. Please check your email.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.isLocked = true;
      }

      await user.save();

      if (user.isLocked) {
        return res.status(403).json({
          message: "Account is locked. Please contact an administrator.",
        });
      }

      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.loginAttempts = 0;
    await user.save();

    await logRequestActivity(req, user.id, "USER_LOGIN", {
      email: user.email,
    });

    if (user.mfaEnabled) {
      const mfaToken = jwt.sign(
        { user: { id: user.id, mfa: "pending" } },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      return res.status(200).json({ mfaRequired: true, mfaToken });
    }

    const accessToken = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { user: { id: user.id } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({
        message: "New password must be different from the current password",
      });
    }

    user.password = newPassword;
    user.loginAttempts = 0;
    user.isLocked = false;
    user.refreshToken = null;
    await user.save();

    await logRequestActivity(req, user.id, "PASSWORD_CHANGED", {
      email: user.email,
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

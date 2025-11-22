const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    mfaSecret: String,
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationTokenExpires: Date,
    attributes: {
      department: {
        type: String,
        required: true,
      },
      location: String,
    },
    clearanceLevel: {
      type: Number,
      required: true,
      default: 0, // Level 0: Public
    },
  },
  { timestamps: true }
);

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = require("crypto").randomBytes(20).toString("hex");

  this.emailVerificationToken = require("crypto")
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return token;
};

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

module.exports = User;

const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testName: {
      type: String,
      required: true,
    },
    resultData: {
      type: Object,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sensitivityLevel: {
      type: Number,
      required: true,
      default: 2, // Level 2: Confidential
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        permissions: [{ type: String, enum: ["read", "write"] }],
      },
    ],
    department: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const TestResult = mongoose.model("TestResult", testResultSchema);

module.exports = TestResult;

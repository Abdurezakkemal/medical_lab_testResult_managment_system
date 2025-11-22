const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const TestResult = require("../src/models/testResult.model");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);

jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("MAC Middleware", () => {
  let highClearanceToken;
  let lowClearanceToken;
  let testResult;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await TestResult.deleteMany({});

    const highUser = await new User({
      username: "mac_high",
      email: "mac_high@test.com",
      password: "password",
      attributes: { department: "Cardiology" },
      clearanceLevel: 5,
    }).save();

    const lowUser = await new User({
      username: "mac_low",
      email: "mac_low@test.com",
      password: "password",
      attributes: { department: "Cardiology" },
      clearanceLevel: 1,
    }).save();

    highClearanceToken = jwt.sign(
      { user: { id: highUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    lowClearanceToken = jwt.sign(
      { user: { id: lowUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    testResult = await new TestResult({
      patientId: highUser._id,
      testName: "Confidential Test",
      resultData: { value: 42 },
      uploadedBy: highUser._id,
      owner: highUser._id,
      sensitivityLevel: 3,
      department: "Cardiology",
    }).save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should allow a user with sufficient clearance to access the test result", async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testResult._id}`)
      .set("Authorization", `Bearer ${highClearanceToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it("should forbid a user with insufficient clearance from accessing the test result", async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testResult._id}`)
      .set("Authorization", `Bearer ${lowClearanceToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty(
      "message",
      "Forbidden: Insufficient security clearance"
    );
  });
});

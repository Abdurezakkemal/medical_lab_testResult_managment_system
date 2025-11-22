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

describe("DAC Middleware", () => {
  let ownerToken;
  let sharedUserToken;
  let otherUserToken;
  let testResult;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await TestResult.deleteMany({});

    const ownerUser = await new User({
      username: "dac_owner",
      email: "dac_owner@test.com",
      password: "password",
      attributes: { department: "Neurology" },
      clearanceLevel: 5,
    }).save();

    const sharedUser = await new User({
      username: "dac_shared",
      email: "dac_shared@test.com",
      password: "password",
      attributes: { department: "Neurology" },
      clearanceLevel: 5,
    }).save();

    const otherUser = await new User({
      username: "dac_other",
      email: "dac_other@test.com",
      password: "password",
      attributes: { department: "Neurology" },
      clearanceLevel: 5,
    }).save();

    ownerToken = jwt.sign(
      { user: { id: ownerUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    sharedUserToken = jwt.sign(
      { user: { id: sharedUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    otherUserToken = jwt.sign(
      { user: { id: otherUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    testResult = await new TestResult({
      patientId: ownerUser._id,
      testName: "Shared Test",
      resultData: { value: 10 },
      uploadedBy: ownerUser._id,
      owner: ownerUser._id,
      sensitivityLevel: 2,
      department: "Cardiology", // Different from all users
      sharedWith: [{ userId: sharedUser._id, permissions: ["read"] }],
    }).save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should allow the owner to access a test result even if ABAC would deny", async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testResult._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it("should allow a shared user to access a test result even if ABAC would deny", async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testResult._id}`)
      .set("Authorization", `Bearer ${sharedUserToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it("should forbid an unrelated user when ABAC denies and DAC does not grant access", async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testResult._id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty(
      "message",
      "Forbidden: You do not have access to this department's records"
    );
  });
});

const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const crypto = require("crypto");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);

jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("Auth API - Email Verification", () => {
  const TEST_EMAIL = "verify@example.com";
  const STRONG_PASSWORD = "ValidPassword123!";

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should register a new user as unverified", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "Verification",
    });

    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user.isVerified).toBe(false);
  });

  it("should prevent an unverified user from logging in", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "Verification",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(res.statusCode).toEqual(401);
  });

  it("should verify a user with a valid token", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "Verification",
    });

    const user = await User.findOne({ email: TEST_EMAIL });
    const token = user.generateEmailVerificationToken();
    await user.save();

    const res = await request(app).get(`/api/v1/auth/verifyemail/${token}`);
    expect(res.statusCode).toEqual(200);

    const updatedUser = await User.findOne({ email: TEST_EMAIL });
    expect(updatedUser.isVerified).toBe(true);
  });

  it("should allow a verified user to log in", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "Verification",
    });

    const user = await User.findOne({ email: TEST_EMAIL });
    const token = user.generateEmailVerificationToken();
    await user.save();

    await request(app).get(`/api/v1/auth/verifyemail/${token}`);

    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(res.statusCode).toEqual(200);
  });

  it("should not verify with an invalid token", async () => {
    const res = await request(app).get("/api/v1/auth/verifyemail/invalidtoken");
    expect(res.statusCode).toEqual(400);
  });
});

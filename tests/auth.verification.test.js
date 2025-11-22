const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const sendEmail = require("../src/services/email.service");

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
    await Role.deleteMany({});
    if (jest.mocked(sendEmail).mock) {
      jest.mocked(sendEmail).mockClear();
    }

    // Create a default "Patient" role required for registration
    await new Role({ name: "Patient" }).save();
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
      department: "VerifyDept",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(res.statusCode).toEqual(401);
  });

  it("should verify a user with a valid token", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "VerifyDept",
    });

    const emailMock = jest.mocked(sendEmail);
    const lastCall =
      emailMock.mock && emailMock.mock.calls.length > 0
        ? emailMock.mock.calls[emailMock.mock.calls.length - 1]
        : null;

    const message = lastCall && lastCall[0] && lastCall[0].message;
    const match = message && message.match(/\/verifyemail\/([a-f0-9]+)/i);
    const verificationToken = match && match[1];

    const res = await request(app).get(
      `/api/v1/auth/verifyemail/${verificationToken}`
    );

    expect(res.statusCode).toEqual(200);
    const updatedUser = await User.findOne({ email: TEST_EMAIL });
    expect(updatedUser.isVerified).toBe(true);
  });

  it("should allow a verified user to log in", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "verifyuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "VerifyDept",
    });

    const emailMock = jest.mocked(sendEmail);
    const lastCall =
      emailMock.mock && emailMock.mock.calls.length > 0
        ? emailMock.mock.calls[emailMock.mock.calls.length - 1]
        : null;

    const message = lastCall && lastCall[0] && lastCall[0].message;
    const match = message && message.match(/\/verifyemail\/([a-f0-9]+)/i);
    const verificationToken = match && match[1];

    await request(app).get(`/api/v1/auth/verifyemail/${verificationToken}`);

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

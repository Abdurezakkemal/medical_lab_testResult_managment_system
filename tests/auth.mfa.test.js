const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const speakeasy = require("speakeasy");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("Auth API - MFA", () => {
  const TEST_EMAIL = "mfa@example.com";
  const STRONG_PASSWORD = "ValidPassword123!";
  let authToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await request(app).post("/api/v1/auth/register").send({
      username: "mfauser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "MFADept",
    });
    await User.updateOne({ email: TEST_EMAIL }, { isVerified: true });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });
    authToken = loginRes.body.accessToken;
  });

  it("should set up MFA and return a QR code", async () => {
    const res = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("qrCodeUrl");
    expect(res.body).toHaveProperty("secret");
  });

  it("should verify the MFA token and enable MFA", async () => {
    const setupRes = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${authToken}`);

    const { secret } = setupRes.body;
    const token = speakeasy.totp({ secret, encoding: "base32" });

    const res = await request(app)
      .post("/api/v1/auth/mfa/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ token });

    expect(res.statusCode).toEqual(200);
    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user.mfaEnabled).toBe(true);
  });

  it("should require MFA token on login when enabled", async () => {
    // Enable MFA first
    const setupRes = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${authToken}`);
    const { secret } = setupRes.body;
    const token = speakeasy.totp({ secret, encoding: "base32" });
    await request(app)
      .post("/api/v1/auth/mfa/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ token });

    // Attempt to log in again
    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("mfaRequired", true);
    expect(res.body).toHaveProperty("mfaToken");
  });

  it("should complete login with a valid MFA token", async () => {
    // Enable MFA
    const setupRes = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${authToken}`);
    const { secret } = setupRes.body;
    let token = speakeasy.totp({ secret, encoding: "base32" });
    await request(app)
      .post("/api/v1/auth/mfa/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ token });

    // Get MFA token for login
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });
    const { mfaToken } = loginRes.body;

    // Verify MFA token for login
    token = speakeasy.totp({ secret, encoding: "base32" });
    const res = await request(app)
      .post("/api/v1/auth/login/mfa/verify")
      .set("Authorization", `Bearer ${mfaToken}`)
      .send({ token });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should fail login with an invalid MFA token", async () => {
    // Enable MFA
    const setupRes = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${authToken}`);
    const { secret } = setupRes.body;
    let token = speakeasy.totp({ secret, encoding: "base32" });
    await request(app)
      .post("/api/v1/auth/mfa/verify")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ token });

    // Get MFA token for login
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });
    const { mfaToken } = loginRes.body;

    // Send invalid token
    const res = await request(app)
      .post("/api/v1/auth/login/mfa/verify")
      .set("Authorization", `Bearer ${mfaToken}`)
      .send({ token: "123456" });

    expect(res.statusCode).toEqual(400);
  });
});

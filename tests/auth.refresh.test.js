const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("Auth API - Refresh Token", () => {
  const TEST_EMAIL = "refresh@example.com";
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
    await request(app).post("/api/v1/auth/register").send({
      username: "refreshuser",
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
      department: "RefreshDept",
    });
    await User.updateOne({ email: TEST_EMAIL }, { isVerified: true });
  });

  it("should receive an access token and a refresh token cookie on login", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should get a new access token with a valid refresh token", async () => {
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    const refreshTokenCookie = loginRes.headers["set-cookie"][0];

    const res = await request(app)
      .get("/api/v1/auth/refresh")
      .set("Cookie", refreshTokenCookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should fail to get a new access token without a refresh token", async () => {
    const res = await request(app).get("/api/v1/auth/refresh");
    expect(res.statusCode).toEqual(401);
  });

  it("should clear the refresh token on logout", async () => {
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    const refreshTokenCookie = loginRes.headers["set-cookie"][0];

    const res = await request(app)
      .get("/api/v1/auth/logout")
      .set("Cookie", refreshTokenCookie);

    expect(res.statusCode).toEqual(204);

    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user.refreshToken).toBeNull();
  });
});

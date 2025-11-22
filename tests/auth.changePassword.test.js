const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const { createUser } = require("./testUtils");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);

jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

const TEST_EMAIL = "changepw@example.com";
const STRONG_PASSWORD = "ValidPassword123!";
const NEW_PASSWORD = "AnotherStrongPass123!";

describe("Auth API - Change Password", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
  });

  it("should change the password for an authenticated user and allow login with the new password", async () => {
    const result = await createUser(
      TEST_EMAIL,
      STRONG_PASSWORD,
      "changepwuser",
      "ChangeDept",
      ["Patient"]
    );

    expect(result).not.toBeNull();
    const { authToken } = result;

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword: STRONG_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Password changed successfully");

    const oldLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    expect(oldLoginRes.statusCode).toEqual(400);
    expect(oldLoginRes.body).toHaveProperty("message", "Invalid credentials");

    const newLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: NEW_PASSWORD,
    });

    expect(newLoginRes.statusCode).toEqual(200);
    expect(newLoginRes.body).toHaveProperty("accessToken");
  });

  it("should reject change-password when current password is incorrect", async () => {
    const result = await createUser(
      TEST_EMAIL,
      STRONG_PASSWORD,
      "changepwuser2",
      "ChangeDept",
      ["Patient"]
    );

    expect(result).not.toBeNull();
    const { authToken } = result;

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: NEW_PASSWORD,
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("message", "Current password is incorrect");
  });
});

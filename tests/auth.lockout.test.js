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

const TEST_EMAIL = "lockout@example.com";
const STRONG_PASSWORD = "ValidPassword123!";

describe("Auth API - Account Lockout", () => {
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

    // Create a default "Patient" role required for registration
    await new Role({ name: "Patient" }).save();

    await createUser(
      TEST_EMAIL,
      STRONG_PASSWORD,
      "lockoutuser",
      "LockoutDept",
      ["Patient"]
    );
  });

  it("should lock the user account in the database after 5 failed login attempts", async () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/login").send({
        email: TEST_EMAIL,
        password: "wrongpassword",
      });
    }

    // Verify in the database that the account is marked as locked
    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user).not.toBeNull();
    expect(user.isLocked).toBe(true);
    expect(user.loginAttempts).toBeGreaterThanOrEqual(5);
  });

  it("should reset login attempts after a successful login", async () => {
    // 2 failed attempts
    await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: "wrongpassword",
    });
    await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: "wrongpassword",
    });

    // Successful login
    await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: STRONG_PASSWORD,
    });

    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user).not.toBeNull();
    expect(user.loginAttempts).toEqual(0);
  });
});

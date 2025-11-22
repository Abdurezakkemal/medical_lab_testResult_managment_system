const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

const TEST_EMAIL = "lockout@example.com";

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
    await request(app).post("/api/v1/auth/register").send({
      username: "lockoutuser",
      email: TEST_EMAIL,
      password: "password123",
      department: "Security",
    });
  });

  it("should lock the user account in the database after 5 failed login attempts", async () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: TEST_EMAIL,
        password: "wrongpassword",
      });
      console.log(
        `[TEST] Attempt ${i + 1}: Status ${
          res.statusCode
        }, Body: ${JSON.stringify(res.body)}`
      );
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
      password: "password123",
    });

    const user = await User.findOne({ email: TEST_EMAIL });
    expect(user).not.toBeNull();
    expect(user.loginAttempts).toEqual(0);
  });
});

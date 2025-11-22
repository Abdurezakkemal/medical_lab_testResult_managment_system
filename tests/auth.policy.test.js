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

describe("Auth API - Password Policy", () => {
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

  const baseUser = {
    username: "policyuser",
    email: "policy@example.com",
    department: "PolicyDept",
  };

  it("should fail registration if password is too short", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "Short1!",
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should fail registration if password is missing an uppercase letter", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "nouppercase1!",
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should fail registration if password is missing a lowercase letter", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "NOLOWERCASE1!",
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should fail registration if password is missing a number", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "NoNumberPassword!",
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should fail registration if password is missing a special character", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "NoSpecialChar1",
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should succeed with a valid password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...baseUser,
        password: "ValidPassword123!",
      });
    expect(res.statusCode).toEqual(201);
  });
});

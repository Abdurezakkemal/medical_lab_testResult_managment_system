const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("RBAC Middleware", () => {
  let adminToken, doctorToken, patientToken;
  let patientUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await Role.deleteMany({});

    const adminRole = await new Role({ name: "Admin" }).save();
    const doctorRole = await new Role({ name: "Doctor" }).save();
    const patientRole = await new Role({ name: "Patient" }).save();

    const adminUser = await new User({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      roles: [adminRole._id],
      attributes: { department: "Administration" },
    }).save();
    const doctorUser = await new User({
      username: "doctor",
      email: "doctor@test.com",
      password: "password",
      roles: [doctorRole._id],
      attributes: { department: "Cardiology" },
    }).save();
    patientUser = await new User({
      username: "patient",
      email: "patient@test.com",
      password: "password",
      roles: [patientRole._id],
      attributes: { department: "General" },
    }).save();

    adminToken = jwt.sign(
      { user: { id: adminUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    doctorToken = jwt.sign(
      { user: { id: doctorUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    patientToken = jwt.sign(
      { user: { id: patientUser._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("GET /api/v1/users", () => {
    it("should allow an admin to get all users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
    });

    it("should forbid a doctor from getting all users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe("GET /api/v1/users/:id", () => {
    it("should allow an admin to get a user by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${patientUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
    });

    it("should allow a doctor to get a user by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${patientUser._id}`)
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(res.statusCode).toEqual(200);
    });

    it("should forbid a patient from getting a user by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${patientUser._id}`)
        .set("Authorization", `Bearer ${patientToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });
});

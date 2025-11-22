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

describe("Admin user & role management API", () => {
  let adminToken;
  let doctorToken;
  let adminUser;
  let doctorUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await Role.deleteMany({});

    const adminRole = await new Role({ name: "Admin" }).save();
    const doctorRole = await new Role({ name: "Doctor" }).save();
    await new Role({ name: "Lab Tech" }).save();

    adminUser = await new User({
      username: "admin_manage",
      email: "admin_manage@test.com",
      password: "password",
      roles: [adminRole._id],
      attributes: { department: "Administration" },
      clearanceLevel: 5,
    }).save();

    doctorUser = await new User({
      username: "managed_doctor",
      email: "managed_doctor@test.com",
      password: "password",
      roles: [doctorRole._id],
      attributes: { department: "Cardiology" },
      clearanceLevel: 3,
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
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("PATCH /api/v1/users/:id/roles", () => {
    it("should allow an admin to update user roles by name", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorUser._id}/roles`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ roles: ["Doctor", "Lab Tech"] });

      expect(res.statusCode).toEqual(200);

      const updated = await User.findById(doctorUser._id).populate("roles");
      const roleNames = updated.roles.map((r) => r.name).sort();
      expect(roleNames).toEqual(["Doctor", "Lab Tech"]);
    });

    it("should forbid a non-admin from updating user roles", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorUser._id}/roles`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ roles: ["Lab Tech"] });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: You do not have the required role."
      );
    });
  });

  describe("PATCH /api/v1/users/:id/lock", () => {
    it("should allow an admin to lock a user account", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorUser._id}/lock`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isLocked: true });

      expect(res.statusCode).toEqual(200);

      const updated = await User.findById(doctorUser._id);
      expect(updated.isLocked).toBe(true);
    });

    it("should forbid a non-admin from locking a user account", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser._id}/lock`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ isLocked: true });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: You do not have the required role."
      );
    });
  });
});

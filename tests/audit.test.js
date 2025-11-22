const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const AuditLog = require("../src/models/auditLog.model");
const { encrypt } = require("../src/services/encryption.service");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);

jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("AuditLog API", () => {
  let adminToken;
  let doctorToken;
  let adminUser;
  let doctorUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await Role.deleteMany({});
    await AuditLog.deleteMany({});

    const adminRole = await new Role({ name: "Admin" }).save();
    const doctorRole = await new Role({ name: "Doctor" }).save();

    adminUser = await new User({
      username: "audit_admin",
      email: "audit_admin@test.com",
      password: "password",
      roles: [adminRole._id],
      attributes: { department: "Administration" },
      clearanceLevel: 5,
    }).save();

    doctorUser = await new User({
      username: "audit_doctor",
      email: "audit_doctor@test.com",
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

    const payload1 = {
      userId: adminUser._id.toString(),
      action: "TEST_ACTION_1",
      details: { foo: "bar" },
      timestamp: "2020-01-01T00:00:00.000Z",
    };

    const payload2 = {
      userId: doctorUser._id.toString(),
      action: "TEST_ACTION_2",
      details: { baz: 42 },
      timestamp: "2020-06-01T00:00:00.000Z",
    };

    const enc1 = encrypt(JSON.stringify(payload1));
    const enc2 = encrypt(JSON.stringify(payload2));

    await AuditLog.create([
      { iv: enc1.iv, encryptedData: enc1.encryptedData },
      { iv: enc2.iv, encryptedData: enc2.encryptedData },
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("GET /api/v1/audit-logs", () => {
    it("should allow an admin to retrieve decrypted audit logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.page).toBe(1);

      const actions = res.body.data.map((log) => log.action).sort();
      expect(actions).toEqual(["TEST_ACTION_1", "TEST_ACTION_2"]);

      const adminLog = res.body.data.find(
        (log) => log.action === "TEST_ACTION_1"
      );
      expect(adminLog).toBeDefined();
      expect(adminLog).toHaveProperty("userId");
      expect(adminLog).toHaveProperty("details");
      expect(adminLog.details).toHaveProperty("foo", "bar");
    });

    it("should forbid a non-admin user from retrieving audit logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: You do not have the required role."
      );
    });

    it("should filter logs by userId", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ userId: adminUser._id.toString() });

      expect(res.statusCode).toEqual(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].userId).toBe(adminUser._id.toString());
      expect(res.body.data[0].action).toBe("TEST_ACTION_1");
    });

    it("should filter logs by action", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ action: "TEST_ACTION_2" });

      expect(res.statusCode).toEqual(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].action).toBe("TEST_ACTION_2");
      expect(res.body.data[0].userId).toBe(doctorUser._id.toString());
    });

    it("should filter logs by time range", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({
          from: "2020-03-01T00:00:00.000Z",
          to: "2020-12-31T23:59:59.000Z",
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].action).toBe("TEST_ACTION_2");
    });

    it("should support pagination metadata", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ page: 1, limit: 1 });

      expect(res.statusCode).toEqual(200);
      expect(res.body.limit).toBe(1);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });
});

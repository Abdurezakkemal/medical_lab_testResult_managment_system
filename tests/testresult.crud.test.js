const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const TestResult = require("../src/models/testResult.model");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);

jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("TestResult CRUD with access control", () => {
  let adminToken;
  let ownerToken;
  let sharedWriteToken;
  let otherDoctorToken;
  let sameDeptDoctorToken;
  let testResult;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await Role.deleteMany({});
    await TestResult.deleteMany({});

    const adminRole = await new Role({
      name: "Admin",
      permissions: ["view_all_results"],
    }).save();

    const doctorRole = await new Role({
      name: "Doctor",
      permissions: ["create_report", "read_patient_data"],
    }).save();

    const adminUser = await new User({
      username: "crud_admin",
      email: "crud_admin@test.com",
      password: "password",
      roles: [adminRole._id],
      attributes: { department: "Administration" },
      clearanceLevel: 5,
    }).save();

    const ownerDoctor = await new User({
      username: "crud_owner_doc",
      email: "crud_owner_doc@test.com",
      password: "password",
      roles: [doctorRole._id],
      attributes: { department: "Cardiology" },
      clearanceLevel: 3,
    }).save();

    const sharedDoctor = await new User({
      username: "crud_shared_doc",
      email: "crud_shared_doc@test.com",
      password: "password",
      roles: [doctorRole._id],
      attributes: { department: "Neurology" },
      clearanceLevel: 3,
    }).save();

    const otherDoctor = await new User({
      username: "crud_other_doc",
      email: "crud_other_doc@test.com",
      password: "password",
      roles: [doctorRole._id],
      attributes: { department: "Neurology" },
      clearanceLevel: 3,
    }).save();

    const sameDeptDoctor = await new User({
      username: "crud_same_dep_doc",
      email: "crud_same_dep_doc@test.com",
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

    ownerToken = jwt.sign(
      { user: { id: ownerDoctor._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    sharedWriteToken = jwt.sign(
      { user: { id: sharedDoctor._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    otherDoctorToken = jwt.sign(
      { user: { id: otherDoctor._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    sameDeptDoctorToken = jwt.sign(
      { user: { id: sameDeptDoctor._id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    testResult = await new TestResult({
      patientId: ownerDoctor._id,
      testName: "Initial Test",
      resultData: { value: 1 },
      uploadedBy: ownerDoctor._id,
      owner: ownerDoctor._id,
      sensitivityLevel: 2,
      department: "Cardiology",
      sharedWith: [
        { userId: sharedDoctor._id, permissions: ["read", "write"] },
      ],
    }).save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("LIST /api/v1/tests", () => {
    it("should allow an admin with view_all_results permission to list all test results", async () => {
      const res = await request(app)
        .get("/api/v1/tests")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("should forbid a doctor without view_all_results permission from listing all test results", async () => {
      const res = await request(app)
        .get("/api/v1/tests")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: You do not have the required role."
      );
    });
  });

  describe("GET /api/v1/tests/:id", () => {
    it("should allow the owner doctor to get their own test result", async () => {
      const res = await request(app)
        .get(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", testResult._id.toString());
    });

    it("should allow a shared user to bypass ABAC via DAC", async () => {
      const res = await request(app)
        .get(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${sharedWriteToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", testResult._id.toString());
    });

    it("should forbid an unrelated doctor from a different department when DAC does not grant access", async () => {
      const res = await request(app)
        .get(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: You do not have access to this department's records"
      );
    });
  });

  describe("PUT /api/v1/tests/:id", () => {
    it("should allow the owner to update the test result", async () => {
      const res = await request(app)
        .put(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ testName: "Updated By Owner" });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("testName", "Updated By Owner");
    });

    it("should allow a shared user with write permission to update the test result", async () => {
      const res = await request(app)
        .put(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${sharedWriteToken}`)
        .send({ testName: "Updated By Shared" });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("testName", "Updated By Shared");
    });

    it("should forbid a non-owner, non-shared doctor in the same department from updating the test result", async () => {
      const res = await request(app)
        .put(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${sameDeptDoctorToken}`)
        .send({ testName: "Attempted Update" });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: Only the owner or users with write access can update this result"
      );
    });
  });

  describe("DELETE /api/v1/tests/:id", () => {
    it("should forbid a non-owner from deleting the test result", async () => {
      const res = await request(app)
        .delete(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${sameDeptDoctorToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty(
        "message",
        "Forbidden: Only the owner can delete this result"
      );
    });

    it("should allow the owner to delete the test result", async () => {
      const res = await request(app)
        .delete(`/api/v1/tests/${testResult._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Test result deleted successfully"
      );

      const deleted = await TestResult.findById(testResult._id);
      expect(deleted).toBeNull();
    });
  });
});

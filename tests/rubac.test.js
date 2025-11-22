const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const jwt = require("jsonwebtoken");
const { createUser } = require("./testUtils");

jest.mock("../src/services/email.service", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock(
  "../src/middleware/captcha.middleware",
  () => (req, res, next) => next()
);

describe("RuBAC Middleware", () => {
  let labTechToken, doctorToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    await Role.deleteMany({});

    // Create a default "Patient" role required for registration
    await new Role({ name: "Patient" }).save();

    const { user: labTechUser } = await createUser(
      "labtech@test.com",
      "ValidPassword123!",
      "labtech",
      "Lab",
      ["Lab Tech"]
    );
    const { user: doctorUser } = await createUser(
      "doctor_rubac@test.com",
      "ValidPassword123!",
      "doctor_rubac",
      "Cardiology",
      ["Doctor"]
    );

    labTechToken = jwt.sign(
      { user: { id: labTechUser._id } },
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

  it("should allow a Lab Tech to access during working hours", async () => {
    const dateSpy = jest.spyOn(Date.prototype, "getHours").mockReturnValue(14); // 2 PM
    const res = await request(app)
      .post("/api/v1/tests/upload")
      .set("Authorization", `Bearer ${labTechToken}`);
    expect(res.statusCode).not.toEqual(403);
    dateSpy.mockRestore();
  });

  it("should forbid a Lab Tech from accessing outside of working hours", async () => {
    const dateSpy = jest.spyOn(Date.prototype, "getHours").mockReturnValue(20); // 8 PM
    const res = await request(app)
      .post("/api/v1/tests/upload")
      .set("Authorization", `Bearer ${labTechToken}`);
    expect(res.statusCode).toEqual(403);
    dateSpy.mockRestore();
  });

  it("should not block a non-Lab Tech user outside of working hours", async () => {
    const dateSpy = jest.spyOn(Date.prototype, "getHours").mockReturnValue(20); // 8 PM
    const res = await request(app)
      .post("/api/v1/tests/upload")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.statusCode).not.toEqual(403);
    dateSpy.mockRestore();
  });
});

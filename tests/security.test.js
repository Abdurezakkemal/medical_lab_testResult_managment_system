const request = require("supertest");
const app = require("../src/app");

describe("Security middleware", () => {
  it("should set security and CORS headers on responses", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toContain(
      "default-src 'self'"
    );
  });
});

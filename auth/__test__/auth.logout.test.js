require("../tests/setupMocks");

const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const redisMock = require("../src/db/redis");
const authController = require("../src/controllers/auth.controller");

// 3. Set up a local test Express app instance
const app = express();
app.use(cookieParser());
app.post("/api/auth/logout", authController.logoutUser);

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully log out a user with a valid token", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["token=valid_jwt_token_example"]);

    // Verifies token gets blacklisted in Redis
    expect(redisMock.set).toHaveBeenCalledWith(
      "blacklist:valid_jwt_token_example",
      "true",
      "EX",
      86400,
    );

    // Verifies response status and message
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "User Logged Out Successfully",
    });

    // Verifies cookie is cleared with proper security configurations
    const cookieHeader = res.headers["set-cookie"][0];
    expect(cookieHeader).toMatch(/token=/);
    expect(cookieHeader).toMatch(/HttpOnly/);
    expect(cookieHeader).toMatch(/Secure/);
    expect(cookieHeader).toMatch(/SameSite=Strict/);
  });


  it("should handle missing token safely by clearing cookies and returning 200", async () => {
    const res = await request(app).post("/api/auth/logout");

    // Ensure Redis wasn't touched because req.cookies.token doesn't exist
    expect(redisMock.set).not.toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "User Logged Out Successfully",
    });
    expect(res.headers["set-cookie"][0]).toMatch(/token=/);
  });


  it("should handle server errors gracefully", async () => {
    // Force your Redis dependency to throw an unhandled rejection error
    redisMock.set.mockRejectedValueOnce(new Error("Redis connection failure"));

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["token=valid_jwt_token_example"]);

    // Verifies your try/catch block intercepts the error and responds with 500
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: "Redis connection failure",
    });
  });
  
});

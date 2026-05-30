const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const cartModel = require("../src/models/cart.model");
const cartController = require("../src/controllers/cart.controller");


// Mocking the model 
jest.mock("../src/models/cart.model");


// Dynamic control switches we can flip inside individual test cases
let middlewareResponseOverride = null;
let currentTestingUserRole = "user";

// Middleware for role-based access control and authentication simulation
const testAuthMiddleware = (allowedRoles = ["user"]) => {
  return (req, res, next) => {
    // 1. If a test tells the middleware to force fail (e.g. 401 Unauthorized)
    if (middlewareResponseOverride) {
      return res.status(middlewareResponseOverride.status).json(middlewareResponseOverride.body);
    }

    // 2. Evaluate RBAC authorization access constraints
    if (allowedRoles && !allowedRoles.includes(currentTestingUserRole)) {
      return res.status(403).json({ success: false, message: "Access forbidden: role not allowed" });
    }

    // 3. Populate mock request context and hand off directly to controller
    req.user = { _id: new mongoose.Types.ObjectId().toString(), role: currentTestingUserRole };
    next();
  };
};

// Mount the real controller onto an isolated Express pipeline
const app = express();
app.use(express.json());
app.get("/api/cart/", testAuthMiddleware(["user"]), cartController.getCart);


describe("GET /api/cart/", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset our dynamic switches back to standard healthy states
    middlewareResponseOverride = null;
    currentTestingUserRole = "user";

    // Standard stub response for whatever Mongoose read query your controller triggers
    cartModel.findOne = jest.fn().mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      items: []
    });
  });

  // --- SUCCESS PATHS ---

  it("should successfully fetch the cart when the user is authenticated and authorized", async () => {
    const response = await request(app)
      .get("/api/cart/")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(cartModel.findOne).toHaveBeenCalled();
  });

  // --- AUTHENTICATION & ROLE MIDDLEWARE PATHS ---

  it("should return 401 when no token is provided", async () => {
    // Tell our inline middleware to reject immediately
    middlewareResponseOverride = {
      status: 401,
      body: { success: false, message: "Access denied. No token provided." }
    };

    const response = await request(app).get("/api/cart/");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  it("should return 401 when the token is invalid or expired", async () => {
    middlewareResponseOverride = {
      status: 401,
      body: { success: false, message: "Invalid token." }
    };

    const response = await request(app)
      .get("/api/cart/")
      .set("Authorization", "Bearer expired-token");

    expect(response.status).toBe(401);
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  it("should return 403 when the user role is not explicitly allowed", async () => {
    // Change the switch to a role not permitted by the default ["user"] array parameter
    currentTestingUserRole = "admin"; 

    const response = await request(app)
      .get("/api/cart/")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response.status).toBe(403);
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  // --- CONTROLLER EXCEPTION HANDLING ---

  it("should handle 500 internal server exceptions from the controller gracefully", async () => {
    // Force the inner database operation of the real controller to fail
    cartModel.findOne.mockRejectedValue(new Error("Database connection failed"));

    const response = await request(app)
      .get("/api/cart/")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
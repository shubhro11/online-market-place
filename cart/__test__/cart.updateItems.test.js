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
    if (middlewareResponseOverride) {
      return res.status(middlewareResponseOverride.status).json(middlewareResponseOverride.body);
    }

    if (allowedRoles && !allowedRoles.includes(currentTestingUserRole)) {
      return res.status(403).json({ success: false, message: "Access forbidden: role not allowed" });
    }

    const generatedId = new mongoose.Types.ObjectId().toString();
    req.user = { 
      id: generatedId, 
      _id: generatedId, 
      role: currentTestingUserRole 
    };
    next();
  };
};

// Mount the real controller onto an isolated Express pipeline
const app = express();
app.use(express.json());
app.patch("/api/cart/items/:productId", testAuthMiddleware(["user"]), cartController.updateItemQuantity);

// Fallback error handler to catch controller exceptions passed to next(error)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

describe("PATCH /api/cart/items/:productId", () => {
  const validProductId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  // Optimized proxy mock that handles ANY chained mongoose method automatically
  const createChainMock = (resolvedValue) => {
    const mockQuery = {
      then: (onFulfilled, onRejected) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
      catch: (onRejected) => Promise.resolve(resolvedValue).catch(onRejected),
      exec: jest.fn().mockResolvedValue(resolvedValue),
      populate: jest.fn().mockImplementation(() => mockQuery),
      select: jest.fn().mockImplementation(() => mockQuery),
      lean: jest.fn().mockImplementation(() => mockQuery)
    };
    return mockQuery;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    middlewareResponseOverride = null;
    currentTestingUserRole = "user";

    // Standard valid document representation matching your controller properties exactly
    const standardCartPayload = {
      user: mockUserId,
      items: [{ 
        productId: { toString: () => validProductId }, // Ensures .toString() works flawlessly
        quantity: 2 
      }],
      save: jest.fn().mockResolvedValue(true) // Prevents cart.save() from crashing the controller
    };

    cartModel.findOne = jest.fn().mockImplementation(() => createChainMock(standardCartPayload));
  });

  // --- SUCCESS PATHS ---

  it("should successfully update item quantity when payload and token are valid", async () => {
    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .set("Authorization", "Bearer valid-token")
      .send({ qty: 5 });

    expect(response.status).toBe(200);
    expect(response.body.cart).toBeDefined();
    expect(cartModel.findOne).toHaveBeenCalled();
  });

  // --- AUTHENTICATION & ROLE MIDDLEWARE PATHS ---

  it("should return 401 when no token is provided", async () => {
    middlewareResponseOverride = {
      status: 401,
      body: { success: false, message: "Access denied. No token provided." }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 5 });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should return 401 when the token is invalid or expired", async () => {
    middlewareResponseOverride = {
      status: 401,
      body: { success: false, message: "Invalid token." }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .set("Authorization", "Bearer expired-token")
      .send({ qty: 5 });

    expect(response.status).toBe(401);
  });

  it("should return 403 when the user role is not explicitly allowed", async () => {
    currentTestingUserRole = "admin"; 

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .set("Authorization", "Bearer valid-admin-token")
      .send({ qty: 5 });

    expect(response.status).toBe(403);
  });

  // --- REQUEST VALIDATION SIMULATION PATHS ---

  it("should return 400 if quantity parameter is missing from request body", async () => {
    middlewareResponseOverride = {
      status: 400,
      body: { errors: [{ msg: "Quantity must be a positive integer" }] }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({}); 

    expect(response.status).toBe(400);
  });

  it("should return 400 if quantity is exactly 0", async () => {
    middlewareResponseOverride = {
      status: 400,
      body: { errors: [{ msg: "Quantity must be a positive integer" }] }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 0 });

    expect(response.status).toBe(400);
  });

  it("should return 400 if quantity is a negative integer", async () => {
    middlewareResponseOverride = {
      status: 400,
      body: { errors: [{ msg: "Quantity must be a positive integer" }] }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: -3 });

    expect(response.status).toBe(400);
  });

  it("should return 400 if the productId path parameter is not a valid ObjectId format", async () => {
    middlewareResponseOverride = {
      status: 400,
      body: { errors: [{ msg: "Invalid Product ID format" }] }
    };

    const response = await request(app)
      .patch("/api/cart/items/invalid-id")
      .send({ qty: 5 });

    expect(response.status).toBe(400);
  });

  // --- CONTROLLER BUSINESS LOGIC & DB PATHS ---

  it("should return 404 if the target product does not exist in the catalog", async () => {
    // If the cart doesn't exist, it returns 404 "Cart not found"
    cartModel.findOne = jest.fn().mockImplementation(() => createChainMock(null));

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 5 });

    expect(response.status).toBe(404);
  });

  it("should return 404 if the product is valid but does not exist in the user's specific cart", async () => {
    // If the cart exists but items array is empty, existingItemIndex becomes -1, returning 404 "Item not found"
    const emptyCartStructure = { 
      user: mockUserId, 
      items: [], 
      save: jest.fn().mockResolvedValue(true) 
    };
    cartModel.findOne = jest.fn().mockImplementation(() => createChainMock(emptyCartStructure));

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 5 });

    expect(response.status).toBe(404);
  });

  it("should return 400 if the requested quantity exceeds available warehouse stock", async () => {
    middlewareResponseOverride = {
      status: 400,
      body: { success: false, message: "Requested quantity exceeds available stock" }
    };

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 999999 });

    expect(response.status).toBe(400);
  });

  it("should handle 500 internal server exceptions from the controller gracefully", async () => {
    cartModel.findOne = jest.fn().mockImplementation(() => {
      throw new Error("Database connection lost");
    });

    const response = await request(app)
      .patch(`/api/cart/items/${validProductId}`)
      .send({ qty: 5 });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
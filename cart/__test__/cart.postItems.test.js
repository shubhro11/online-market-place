const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

// --- CREATE MOCK FUNCTIONS BEFORE MOCKING ---
// AuthMiddleware(roles) should return a middleware function
const mockAuthMiddleware = jest
  .fn()
  .mockImplementation((roles) => (req, res, next) => {
    req.user = { _id: "user-123", role: "user" };
    next();
  });

// Create a mock validator function that can be controlled per test
const mockValidatorHandler = jest.fn((req, res, next) => next());

// Validators are arrays of middleware
const mockValidateCart = [mockValidatorHandler];
const mockValidateCartUpdate = [mockValidatorHandler];

// --- MOCKS ---
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  AuthMiddleware: mockAuthMiddleware,
}));

jest.mock("../src/validators/cart.validator.js", () => ({
  validateCart: mockValidateCart,
  validateCartUpdate: mockValidateCartUpdate,
}));

jest.mock("../src/models/cart.model");

// Now require after mocks are set up
const cartRouter = require("../src/routes/cart.route");
const cartModel = require("../src/models/cart.model");

// --- APP SETUP ---
const app = express();
app.use(express.json());
app.use("/api/cart", cartRouter);

// --- TEST CASES ---
describe("POST /api/cart/items", () => {
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default implementations
    mockAuthMiddleware.mockImplementation((roles) => (req, res, next) => {
      req.user = { _id: "user-123", role: "user" };
      next();
    });

    mockValidatorHandler.mockImplementation((req, res, next) => next());

    // Set up standard authorized context
    mockUser = { _id: new mongoose.Types.ObjectId().toString(), role: "user" };
  });

  // --- CONTROLLER LOGIC ---

  it("should create a new cart and add the first item if no cart exists", async () => {
    cartModel.findOne.mockResolvedValue(null);

    const mockSave = jest.fn().mockResolvedValue(true);
    cartModel.mockImplementation(() => ({
      items: [],
      save: mockSave,
    }));

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: new mongoose.Types.ObjectId().toString(), qty: 2 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Item added to cart successfully");
  });

  it("should increment quantity when the item already exists in the cart", async () => {
    const targetProductId = new mongoose.Types.ObjectId().toString();
    const fakeCart = {
      userId: mockUser._id,
      items: [{ productId: targetProductId, quantity: 1 }],
      save: jest.fn().mockResolvedValue(true),
    };

    cartModel.findOne.mockResolvedValue(fakeCart);

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: targetProductId, qty: 3 });

    expect(response.status).toBe(200);
    expect(fakeCart.items[0].quantity).toBe(4);
    expect(fakeCart.save).toHaveBeenCalled();
  });

  it("should append a new item if the cart exists but doesn't have this product", async () => {
    const existingProductId = new mongoose.Types.ObjectId().toString();
    const newProductId = new mongoose.Types.ObjectId().toString();
    const fakeCart = {
      userId: mockUser._id,
      items: [{ productId: existingProductId, quantity: 1 }],
      save: jest.fn().mockResolvedValue(true),
    };

    cartModel.findOne.mockResolvedValue(fakeCart);

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: newProductId, qty: 5 });

    expect(response.status).toBe(200);
    expect(fakeCart.items.length).toBe(2);
  });

  it("should handle 500 internal server errors gracefully", async () => {
    cartModel.findOne.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: new mongoose.Types.ObjectId().toString(), qty: 1 });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Database connection failed");
  });

  // --- VALIDATION MIDDLEWARE ---

  it("should return a validation error for an invalid productId", async () => {
    mockValidatorHandler.mockImplementation((req, res, next) => {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID format" });
    });

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: "not-a-valid-object-id", qty: 2 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should return a validation error for non-positive quantity", async () => {
    mockValidatorHandler.mockImplementation((req, res, next) => {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be greater than 0" });
    });

    const response = await request(app)
      .post("/api/cart/items")
      .send({ productId: new mongoose.Types.ObjectId().toString(), qty: 0 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

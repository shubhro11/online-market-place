require("../tests/setupMocks");
const dbHandler = require("../tests/dbHandler");

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app.js"); // Path to your Express app
const Product = require("../src/models/product.model.js"); // Path to your Product model

// Generate a static valid ObjectId for the seller so it matches across the middleware and DB seeding
const mockSellerId = new mongoose.Types.ObjectId().toString();

// Define a dynamic target to control who is logged in
let mockUser = null;

// Mock the AuthMiddleware to dynamically look at the mockUser object
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  AuthMiddleware: (roles) => (req, res, next) => {
    // If no mock user is set, simulate what your real middleware does (return 401)
    if (!mockUser) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    // Otherwise, simulate a successful login using the configured properties
    req.user = mockUser;
    next();
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-static-uuid-1111-2222')
}));

describe("DELETE /api/products/:id (SELLER)", () => {
  let sellerToken, mockProductId, currentSellerId;

  beforeAll(async () => await dbHandler.connect());
  afterEach(async () => await dbHandler.clearDatabase());
  afterAll(async () => await dbHandler.closeDatabase());

  beforeEach(() => {
    sellerToken = "Bearer valid-seller-jwt-token";
    mockProductId = new mongoose.Types.ObjectId();
    currentSellerId = new mongoose.Types.ObjectId().toString();

    // Default state: Logged in as the current legitimate product seller
    mockUser = { id: currentSellerId, role: "seller" };
  });

  describe("Success Scenarios", () => {
    it("should allow a seller to delete their own product and return 200", async () => {
      await Product.create({
        _id: mockProductId,
        title: "Seller Product",
        price: { amount: 100 },
        seller: currentSellerId,
      });

      const response = await request(app)
        .delete(`/api/products/${mockProductId}`)
        .set("Authorization", sellerToken);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Product successfully deleted",
      });

      const dbProduct = await Product.findById(mockProductId);
      expect(dbProduct).toBeNull();
    });
  });

  describe("Auth & Role Scenarios", () => {
    it("should return 401 Unauthorized if no token is provided", async () => {
      await Product.create({
        _id: mockProductId,
        title: "Some Product",
        price: { amount: 100 },
        seller: currentSellerId,
      });

      // 💡 CHANGE: Simulate no valid user/session being decoded
      mockUser = null;

      const response = await request(app).delete(
        `/api/products/${mockProductId}`,
      ); // No token

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 Forbidden if a seller tries to delete another seller's product", async () => {
      const differentSellerId = new mongoose.Types.ObjectId().toString();

      await Product.create({
        _id: mockProductId,
        title: "Someone Else's Product",
        price: { amount: 150 },
        seller: differentSellerId, // Database product owned by 'differentSellerId'
      });

      // 💡 CHANGE: Ensure our mockUser ID does NOT match the owner ID in the database
      mockUser = { id: currentSellerId, role: "seller" };

      const response = await request(app)
        .delete(`/api/products/${mockProductId}`)
        .set("Authorization", sellerToken);

      expect(response.statusCode).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: "Forbidden: You can only delete your own products",
      });
    });
  });

  describe("Error & Edge Case Scenarios", () => {
    it("should return 404 Not Found if the product does not exist", async () => {
      const response = await request(app)
        .delete(`/api/products/${mockProductId}`)
        .set("Authorization", sellerToken);

      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Product not found",
      });
    });

    it("should return 400 Bad Request if the product ID format is invalid", async () => {
      const invalidId = "invalid-id-123";

      const response = await request(app)
        .delete(`/api/products/${invalidId}`)
        .set("Authorization", sellerToken);

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Invalid product id",
      });
    });

    it("should return 500 Internal Server Error if a database exception occurs", async () => {
      const spy = jest
        .spyOn(Product, "findOne")
        .mockRejectedValueOnce(new Error("Database error connection failed"));

      const response = await request(app)
        .delete(`/api/products/${mockProductId}`)
        .set("Authorization", sellerToken);

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Database error connection failed",
      });

      spy.mockRestore();
    });

  });
});

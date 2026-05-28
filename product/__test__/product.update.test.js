require("../tests/setupMocks");
const dbHandler = require("../tests/dbHandler");

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Product = require("../src/models/product.model");

// 💡 Control state variable to simulate authentication scenarios dynamically
let mockUser = null;

// Mock the AuthMiddleware to completely bypass signature checks and use our control variable
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  AuthMiddleware: (roles) => (req, res, next) => {
    // 1. Simulate a 401 if no active auth session token state is provided
    if (!mockUser) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    // 2. Simulate a 403 if the endpoint demands a role the user doesn't possess
    if (roles && roles.length > 0 && !roles.includes(mockUser.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Access denied" });
    }

    // 3. Populate user context and move seamlessly to your controller layer
    req.user = mockUser;
    next();
  },
}));

describe("PATCH /api/products/:id (SELLER)", () => {
  let sellerId1;
  let sellerId2;

  beforeAll(async () => {
    await dbHandler.connect();
    await Product.syncIndexes();

    // Generate consistent hex string formats matching middleware attachments
    sellerId1 = new mongoose.Types.ObjectId().toString();
    sellerId2 = new mongoose.Types.ObjectId().toString();
  });

  afterEach(async () => await dbHandler.clearDatabase());
  afterAll(async () => await dbHandler.closeDatabase());

  beforeEach(() => {
    // Default State: Safely assume standard operating user is the target seller
    mockUser = { id: sellerId1, role: "seller" };
  });

  // Helper utility to seed clean product data into the memory DB per test case
  const createProduct = (overrides = {}) => {
    return Product.create({
      title: overrides.title ?? "Patch Target",
      description: overrides.description ?? "To be updated",
      price: overrides.price ?? {
        amount: 10,
        currency: "USD",
      },
      seller: overrides.seller ?? sellerId1,
      images: overrides.images ?? [],
    });
  };

  // --- SUCCESS OPERATION CASES ---
  describe("Successful Patch Operations", () => {

    it("updates allowed fields and returns updated product (200)", async () => {
      const prod = await createProduct({
        title: "Old",
        description: "OldDesc",
        price: { amount: 10, currency: "USD" },
      });

      const payload = {
        title: "New",
        description: "NewDesc",
        price: { amount: 25, currency: "USD" },
      };

      const res = await request(app)
        .patch(`/api/products/${prod._id}`)
        .set("Authorization", "Bearer dummy-token")
        .send(payload);

      expect(res.status).toBe(200);

      const body = res.body || {};
      const updated = body.product;

      expect(updated).toBeTruthy();
      expect(updated.title).toBe("New");
      expect(updated.description).toBe("NewDesc");
      expect(updated.price.amount).toBe(25);
      expect(updated.price.currency).toBe("USD");

      // Cross-verify changes exist on actual Database Document record
      const updatedRecord = await Product.findById(prod._id);
      expect(updatedRecord.title).toBe("New");
      expect(updatedRecord.description).toBe("NewDesc");
      expect(updatedRecord.price.amount).toBe(25);
      expect(updatedRecord.price.currency).toBe("USD");
    });
  });

  // --- VALIDATION & NOT FOUND CASES ---
  describe("Input Validation & Error Routing", () => {

    it("returns 400 for invalid product id", async () => {
      const res = await request(app)
        .patch("/api/products/not-a-valid-id")
        .set("Authorization", "Bearer dummy-token")
        .send({ title: "X" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when product not found", async () => {
      const missingId = new mongoose.Types.ObjectId().toHexString();

      const res = await request(app)
        .patch(`/api/products/${missingId}`)
        .set("Authorization", "Bearer dummy-token")
        .send({ title: "New" });

      expect(res.status).toBe(404);
    });

  });

  // --- AUTHENTICATION & AUTHORIZATION CASES ---
  describe("Auth & Permission Constraints", () => {

    it("requires authentication (401) when no token provided", async () => {
      const prod = await createProduct();

      // Force dynamic user state to unauthenticated context
      mockUser = null;

      const res = await request(app)
        .patch(`/api/products/${prod._id}`)
        .send({ title: "Nope" });

      expect(res.status).toBe(401);
    });

    it("requires seller role (403) when role is not seller", async () => {
      const prod = await createProduct();

      // Force dynamic user to possess an unauthorized consumer profile role
      mockUser = { id: sellerId1, role: "user" };

      const res = await request(app)
        .patch(`/api/products/${prod._id}`)
        .set("Authorization", "Bearer dummy-token")
        .send({ title: "Nope" });

      expect(res.status).toBe(403);
    });

    it("returns 404 when another seller attempts update", async () => {
      const otherProd = await createProduct({ seller: sellerId2 });

      // Logged in user profile belongs to sellerId1, but product is owned by sellerId2
      mockUser = { id: sellerId1, role: "seller" };

      const res = await request(app)
        .patch(`/api/products/${otherProd._id}`)
        .set("Authorization", "Bearer dummy-token")
        .send({ title: "Hack" });

      expect(res.status).toBe(404);

      const untamperedRecord = await Product.findById(otherProd._id);
      expect(untamperedRecord.title).toBe("Patch Target");
    });

  });
  
});

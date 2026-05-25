const request = require("supertest");
const app = require("../src/app"); 
const userModel = require("../src/models/user.model"); 

const mockUserId = "60c72b2f9b1d8b2badfa9999";
const mockAddressId = "60c72b2f9b1d8b2badfa0000";

// 1. Mock your authentication middleware structure
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  authMiddleware: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = { id: mockUserId };
    next();
  }
}));

// 2. Mock Mongoose model methods explicitly used across your endpoints
jest.mock("../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

describe("Address Management API (/api/auth/users/me/addresses)", () => {
  let authToken;

  beforeAll(() => {
    authToken = "Bearer mock-valid-jwt-token";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. POST /api/auth/users/me/addresses
  // ==========================================
  describe("POST /api/auth/users/me/addresses", () => {
    it("should successfully add a new address with valid data", async () => {
      const validAddress = {
        addressLine1: "123 Main Street",
        addressLine2: "Apartment 4B",
        city: "Metropolis",
        state: "Delhi",
        pincode: "110001", 
        country: "India",
        addressType: "home",
        isDefault: true,
      };

      userModel.findOneAndUpdate.mockImplementation(() => ({
        then: (resolve) => resolve({
          _id: mockUserId,
          addresses: [{ _id: mockAddressId, ...validAddress }]
        })
      }));

      const res = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", authToken)
        .send(validAddress);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.addresses).toHaveProperty("_id");
    });

    it("should return 400 if the pincode is invalid", async () => {
      const invalidPincodeAddress = {
        addressLine1: "456 Oak Avenue",
        city: "Gotham",
        state: "Maharashtra",
        pincode: "ABCDEF", 
        country: "India",
      };

      const res = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", authToken)
        .send(invalidPincodeAddress);

      expect(res.statusCode).toBe(400); 
    });

    it("should return 401 if the user is unauthenticated", async () => {
      const res = await request(app)
        .post("/api/auth/users/me/addresses")
        .send({ addressLine1: "No Token St" });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==========================================
  // 2. GET /api/auth/users/me/addresses
  // ==========================================
  describe("GET /api/auth/users/me/addresses", () => {
    it("should retrieve a list of all saved addresses for the user", async () => {
      userModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: mockUserId,
          addresses: [{ _id: mockAddressId, addressLine1: "123 Main Street", isDefault: true }]
        })
      }));

      const res = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.addresses)).toBe(true);
    });

    it("should explicitly mark which address is the default one", async () => {
      userModel.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: mockUserId,
          addresses: [{ _id: mockAddressId, isDefault: true }]
        })
      }));

      const res = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.addresses[0]).toHaveProperty("isDefault");
      expect(typeof res.body.addresses[0].isDefault).toBe("boolean");
    });
  });

  // ==========================================
  // 3. DELETE /api/auth/users/me/addresses/:addressId
  // ==========================================
  describe("DELETE /api/auth/users/me/addresses/:addressId", () => {
    it("should delete the specified address and return a success message", async () => {
      // 1. Mock findOne to simulate that the address exists before removal
      userModel.findOne.mockResolvedValue({ _id: mockUserId });

      // 2. Mock findOneAndUpdate to return the updated user document (with an empty addresses array)
      userModel.findOneAndUpdate.mockImplementation(() => ({
        then: (resolve) => resolve({
          _id: mockUserId,
          addresses: [] // Empty array confirms that "addressExists" will evaluate to false
        })
      }));

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${mockAddressId}`)
        .set("Authorization", authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Address Deleted Successfully");
      expect(Array.isArray(res.body.addresses)).toBe(true);
    });

    it("should return 404 if trying to delete a non-existent address", async () => {
      // Mock findOne to return null, mimicking that the address was not found
      userModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${mockAddressId}`)
        .set("Authorization", authToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Address not found"); // Matches your controller's exit response string
    });
  });
});
const request = require("supertest");
const app = require("../src/app");
const userModel = require("../src/models/user.model");
const dbHandler = require("../tests/dbHandler");
const bcrypt = require("bcryptjs"); // Matches your api import

// Use the database helper hooks
beforeAll(() => dbHandler.connect());
afterEach(() => dbHandler.clearDatabase());
afterAll(() => dbHandler.closeDatabase());

describe("POST /api/auth/login Test Suite", () => {
  const seedUser = {
    username: "dev_pixel",
    email: "developer@example.com",
    password: "SecurePassword123!",
    fullName: {
      firstName: "John",
      lastName: "Doe",
    },
  };

  // Seed a single, correctly hashed user before each test
  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(seedUser.password, 10);

    await userModel.create({
      ...seedUser,
      password: hashedPassword, // ONLY create the user once here!
    });
  });

  // --- SUCCESS CASES ---
  describe("Happy Path (Flexible Identity)", () => {
    it("should successfully authenticate when using the EMAIL + PASSWORD", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: seedUser.email,
        password: seedUser.password,
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes("token="))).toBe(true);
    });

    it("should successfully authenticate when using the USERNAME + PASSWORD", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: seedUser.username,
        password: seedUser.password,
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes("token="))).toBe(true);
    });

    it("should successfully authenticate a user who HAS a middle name defined", async () => {
      await userModel.deleteMany({});
      const hashedPassword = await bcrypt.hash(seedUser.password, 10);

      await userModel.create({
        ...seedUser,
        email: "alex@example.com",
        username: "alex_dev",
        password: hashedPassword,
        fullName: {
          firstName: "Alex",
          middleName: "Kumar",
          lastName: "Singh",
        },
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "alex@example.com",
        password: seedUser.password,
      });

      expect(response.statusCode).toBe(200);
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes("token="))).toBe(true);
    });
  });

  // --- INPUT VALIDATION BOUNDARIES ---
  describe("Strict Field Validation Rules", () => {
    it("should return 400 if password is correct but BOTH email and username are missing", async () => {
      const response = await request(app).post("/api/auth/login").send({
        password: seedUser.password,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if EMAIL is provided but PASSWORD is missing", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: seedUser.email,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if USERNAME is provided but PASSWORD is missing", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: seedUser.username,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if fields are present but passed as empty strings", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: "",
        email: "",
        password: seedUser.password,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --- INVALID CREDENTIALS ---
  describe("Authentication Failures", () => {
    it("should return 401 if a valid identity format is sent but the password is wrong", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: seedUser.username,
        password: "SecurePassword123!_wrong", // Perfectly passes regex validation, fails DB check
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

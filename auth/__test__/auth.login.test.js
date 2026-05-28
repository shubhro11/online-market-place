const dbHandler = require("../tests/dbHandler");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const userModel = require("../src/models/user.model");


describe("POST /api/auth/login Test Suite", () => {
  
  beforeAll(async () => {
    await dbHandler.connect();
    await userModel.ensureIndexes();
  });
  
  afterEach(async () => await dbHandler.clearDatabase());
  afterAll(async () => await dbHandler.closeDatabase());

  const seedUser = {
    username: "dev_pixel",
    email: "developer@example.com",
    password: "SecurePassword123!",
    fullName: {
      firstName: "John",
      lastName: "Doe",
    },
  };

  // Automatically seeds a cleanly hashed database profile before every test execution
  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(seedUser.password, 10);
    await userModel.create({
      ...seedUser,
      password: hashedPassword,
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
      // Clear out the beforeEach seeded profile to check explicit middleName variants cleanly
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
        password: "SecurePassword123!_wrong",
      });

      expect(response.statusCode).toBe(401);
    });

  });

});
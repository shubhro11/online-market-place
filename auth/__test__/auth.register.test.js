const dbHandler = require("../tests/dbHandler");

const request = require("supertest");
const app = require("../src/app");
const userModel = require("../src/models/user.model");


describe('POST /api/auth/register', () => {

  beforeAll(async () => {
    await dbHandler.connect();
    // Enforces unique compound or text indexes for the user collections in-memory
    await userModel.ensureIndexes();
  });
  
  afterEach(async () => await dbHandler.clearDatabase());
  afterAll(async () => await dbHandler.closeDatabase());

  const validUserPayload = {
    username: "pixel_dev",
    email: "pixel@example.com",
    password: "SecurePassword123!",
    fullName: {
      firstName: "Jane",
      lastName: "Doe",
    },
  };

  // --- SUCCESS SCENARIOS ---
  describe('Success Scenarios', () => {
    it('should create a user, hash the password, and omit password from response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', validUserPayload.email);
      expect(response.body.user).not.toHaveProperty('password');

      const dbUser = await userModel.findOne({ email: validUserPayload.email }).select('+password');
      expect(dbUser).toBeTruthy();
      expect(dbUser.fullName.firstName).toBe(validUserPayload.fullName.firstName);
      
      expect(dbUser.password).not.toBe(validUserPayload.password);
      expect(dbUser.password).toBeDefined();
      expect(dbUser.password.length).toBeGreaterThan(20); 
    });
  });

  // --- INPUT VALIDATION FAILURES ---
  describe('Input Validation Failures', () => {

    it('should fail if email is missing', async () => {
      const { email, ...payloadWithoutEmail } = validUserPayload;

      const response = await request(app)
        .post('/api/auth/register')
        .send(payloadWithoutEmail);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should fail if password is missing', async () => {
      const { password, ...payloadWithoutPassword } = validUserPayload;

      const response = await request(app)
        .post('/api/auth/register')
        .send(payloadWithoutPassword);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should fail if username is missing', async () => {
      const { username, ...payloadWithoutUsername } = validUserPayload;

      const response = await request(app)
        .post('/api/auth/register')
        .send(payloadWithoutUsername);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject poorly formatted emails', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUserPayload, email: 'not-an-email-address' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject passwords that do not meet complexity requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUserPayload, password: '123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject empty or whitespace-only inputs', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserPayload,
          username: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

  });

  // --- ACCOUNT DUPLICATION FAILURES ---
  describe('Account Duplication Failures', () => {

    it('should reject a duplicate email address', async () => {
      await userModel.create({
        username: 'existinguser',
        email: 'duplicate@example.com',
        password: 'hashedpassword123',
        fullName: { firstName: 'Alice', lastName: 'Smith' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserPayload,
          username: 'newusername',
          email: 'duplicate@example.com'
        });

      expect(response.status).toBe(409);
    });

    it('should handle email uniqueness case-insensitively', async () => {
      await userModel.create({
        username: 'user1',
        email: 'Alex@Example.com',
        password: 'hashedpassword123',
        fullName: { firstName: 'Alex', lastName: 'G' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserPayload,
          username: 'user2',
          email: 'alex@example.com'
        });

      expect(response.status).toBe(409);
    });

    it('should reject a duplicate username', async () => {
      await userModel.create({
        username: 'cloneme',
        email: 'first@example.com',
        password: 'hashedpassword123',
        fullName: { firstName: 'Clone', lastName: 'Me' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserPayload,
          username: 'cloneme',
          email: 'second@example.com'
        });

      expect(response.status).toBe(409);
    });

  });
});
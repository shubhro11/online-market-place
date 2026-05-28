require("../tests/setupMocks")
const dbHandler = require('../tests/dbHandler');

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const productModel = require('../src/models/product.model'); 


describe('GET /api/products/:id Integration Tests', () => {
  const mockSellerId = new mongoose.Types.ObjectId();
  let existingProduct;

  beforeAll(async () => {
    await dbHandler.connect();
  });

  beforeEach(async () => {
    // Seed a sample product before each test to ensure a clean state
    existingProduct = await productModel.create({
      title: 'Premium Wireless Over-Ear Headphones',
      description: 'Active noise cancelling headphones with 40h battery life.',
      price: { amount: 12000, currency: 'INR' },
      seller: mockSellerId,
      images: [{ url: 'https://example.com/h1.jpg', thumbnail: 'https://example.com/h1_t.jpg', id: 'img1' }]
    });
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  // --- SUCCESS CASES ---
  describe('// --- SUCCESS CASES ---', () => {

    test('should return 200 and the correct product when a valid existing ID is supplied', async () => {
      const res = await request(app)
        .get(`/api/products/${existingProduct._id}`)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        product: expect.objectContaining({
          _id: existingProduct._id.toString(),
          title: 'Premium Wireless Over-Ear Headphones',
          description: 'Active noise cancelling headphones with 40h battery life.'
        })
      });
      expect(res.body.product.price.amount).toBe(12000);
    });

  });

  // --- FAILURE / VALIDATION CASES ---
  describe('// --- FAILURE / VALIDATION CASES ---', () => {

    test('should return 404 when the product ID is syntactically valid but does not exist in the database', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/products/${nonExistentId}`)
        .expect(404);

      expect(res.body).toEqual({
        success: false,
        message: 'Product not found'
      });
    });

    test('should trigger the catch block and return 500 when the ID format is completely malformed', async () => {
      const malformedId = 'not-a-valid-mongodb-object-id';

      const res = await request(app)
        .get(`/api/products/${malformedId}`)
        .expect(500);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      // CastError occurs because Mongoose findById fails to cast the string to an ObjectId
      expect(res.body.message).toContain('Cast to ObjectId failed');
    });

  });
});
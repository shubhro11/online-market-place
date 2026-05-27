const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app'); // Path to your Express app
const productModel = require('../src/models/product.model'); // Path to your Product model
const dbHandler = require("../tests/dbHandler"); // Import the helper we just made

// Use the database helper hooks globally
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

// 1. Mock ImageKit (Using your official @imagekit/nodejs package)
jest.mock('../src/services/imagekit.service.js', () => {
  return jest.fn().mockResolvedValue({
    url: 'https://ik.imagekit.io/mock/test-image.jpg',
    thumbnail: 'https://ik.imagekit.io/mock/test-image_thumb.jpg',
    id: 'mock_file_id_123'
  });
});

// 2. Keep your UUID mock for standard safety
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-static-uuid-1111-2222')
}));

describe('POST /api/products', () => {
  let mockSellerId;
  let authToken; 
  let validProduct; // Declared here so it's accessible across it() blocks

  beforeAll(() => {
    mockSellerId = new mongoose.Types.ObjectId().toString();

    // Sign a mock token using the exact secret fallback defined in your dbHandler
    authToken = jwt.sign(
      { id: mockSellerId, role: 'seller' },
      process.env.JWT_SECRET || 'test_fallback_jwt_secret_key_12345',
      { expiresIn: '1h' }
    );

    // Initialize validProduct now that mockSellerId is defined
    validProduct = {
      title: 'Wireless Headphones',
      description: 'Noise-canceling over-ear headphones',
      price: {
        amount: 4999,
        currency: 'INR'
      },
      seller: mockSellerId,
      images: [
        {
          url: 'https://example.com/images/headphones.jpg',
          thumbnail: 'https://example.com/images/thumbnails/headphones.jpg',
          id: 'file_id_12345'
        }
      ]
    };
  });

  // --- SUCCESS CASES ---
  describe('Success Cases', () => {
    it('should successfully create a product with valid data and images', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', validProduct.title)
        .field('description', validProduct.description)
        .field('amount', validProduct.price.amount)
        .field('currency', validProduct.price.currency)
        .field('seller', validProduct.seller)
        .attach('images', Buffer.from('mock-image-binary'), 'headphones.jpg');

      expect(response.status).toBe(201);
    });

    it('should use default currency (INR) if not provided', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', 'Minimalist Wallet')
        .field('amount', 999)
        .field('seller', mockSellerId);

      expect(response.status).toBe(201);
    });

    it('should create a product without optional descriptions or images', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', 'Simple Mug')
        .field('amount', 299)
        .field('seller', mockSellerId);

      expect(response.status).toBe(201);
    });
  });

  // --- FAILURE / VALIDATION CASES ---
  describe('Failure/Validation Cases', () => {
    it('should return 400 if required fields are missing (title, price)', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('description', 'Missing everything else');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'title', msg: 'Title is required' }),
          expect.objectContaining({ path: 'amount', msg: 'Price amount is required' })
        ])
      );
    });

    it('should return 400 if currency is not INR or USD', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', 'Invalid Currency Item')
        .field('amount', 50)
        .field('currency', 'EUR')
        .field('seller', mockSellerId);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'currency', msg: 'Currency must be USD or INR' })
        ])
      );
    });

    it('should return 400 if price amount is 0 or less', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', 'Free Item?')
        .field('amount', -5)
        .field('seller', mockSellerId);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'amount', msg: 'Price must be a number & should be greater than 0' })
        ])
      );
    });

    it('should return 400 if description exceeds 1000 characters', async () => {
      const longDescription = 'a'.repeat(1001);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`) // Bypass 401
        .field('title', 'Super Long Description Item')
        .field('amount', 299)
        .field('description', longDescription)
        .field('seller', mockSellerId);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'description', msg: 'Description must be within 1000 characters' })
        ])
      );
    });
  });
});
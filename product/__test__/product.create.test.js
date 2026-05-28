require("../tests/setupMocks");
const dbHandler = require("../tests/dbHandler");

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app'); 

// 💡 Control state variable to simulate authentication states dynamically
let mockUser = null;

// Mock the AuthMiddleware to completely bypass signature checks and use our control variable
jest.mock('../src/middlewares/auth.middleware.js', () => ({
  AuthMiddleware: (roles) => (req, res, next) => {
    // 1. Simulate a 401 if no active auth session state is provided
    if (!mockUser) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    
    // 2. Simulate a 403 if the endpoint demands a role the user doesn't possess
    if (roles && roles.length > 0 && !roles.includes(mockUser.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
    }

    // 3. Populate user context and move seamlessly to your controller layer
    req.user = mockUser;
    next();
  }
}));

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('POST /api/products', () => {
  let mockSellerId;
  let validProduct; 

  beforeEach(() => {
    mockSellerId = new mongoose.Types.ObjectId().toString();

    // Default State: Safely assume standard operating user is the target seller
    mockUser = { id: mockSellerId, role: 'seller' };

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

  // ==========================================
  // --- 1. SUCCESS CASES ---
  // ==========================================
  describe('Success Cases', () => {
    
    it('should successfully create a product with valid data and images', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer fake-valid-token')
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
        .set('Authorization', 'Bearer fake-valid-token')
        .field('title', 'Minimalist Wallet')
        .field('amount', 999)
        .field('seller', mockSellerId);

      expect(response.status).toBe(201);
    });

    it('should create a product without optional descriptions or images', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer fake-valid-token')
        .field('title', 'Simple Mug')
        .field('amount', 299)
        .field('seller', mockSellerId);

      expect(response.status).toBe(201);
    });

  });

  // ==========================================
  // --- 2. FAILURE / VALIDATION CASES ---
  // ==========================================
  describe('Failure/Validation Cases', () => {

    it('should return 400 if required fields are missing (title, price)', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer fake-valid-token')
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
        .set('Authorization', 'Bearer fake-valid-token')
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
        .set('Authorization', 'Bearer fake-valid-token')
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
        .set('Authorization', 'Bearer fake-valid-token')
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

    it('should return 401 Unauthorized if no token is provided', async () => {
      // Force user state to unauthenticated
      mockUser = null;

      const response = await request(app)
        .post('/api/products')
        .field('title', 'Unauthorized Item')
        .field('amount', 100);

      expect(response.status).toBe(401);
    });

  });
});
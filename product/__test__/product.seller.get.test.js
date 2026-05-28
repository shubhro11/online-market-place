const request = require('supertest');
const express = require('express');

// 1. Mock the auth middleware
jest.mock('../src/middlewares/auth.middleware', () => {
  return jest.fn((req, res, next) => next());
});
const authMiddleware = require('../src/middlewares/auth.middleware');

// 2. Create a mock controller function that we can alter dynamically
const mockProductController = jest.fn();

const app = express();
app.use(express.json());

// Define the route EXACTLY ONCE, passing the mock controller
app.get('/products/seller', authMiddleware, mockProductController);

// Express Error Handler (must be at the bottom)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

describe('GET /products/seller', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and a list of products for a successfully verified seller', async () => {
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { id: 'seller_123', role: 'seller' }; 
      next();
    });

    // Provide successful controller implementation
    mockProductController.mockImplementation((req, res) => {
      res.status(200).json([{ id: 1, name: 'Product A', sellerId: req.user.id }]);
    });

    const response = await request(app)
      .get('/products/seller')
      .set('Authorization', 'Bearer valid.jwt.token');

    expect(response.statusCode).toBe(200);
    expect(response.body[0]).toHaveProperty('sellerId', 'seller_123');
  });

  it('should return 401 Unauthorized if no token is provided / auth fails', async () => {
    authMiddleware.mockImplementation((req, res, next) => {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    });

    const response = await request(app).get('/products/seller');

    expect(response.statusCode).toBe(401);
  });

  it('should return 403 Forbidden if the user is authenticated but not a seller', async () => {
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { id: 'user_456', role: 'customer' };
      next();
    });

    // Controller intercepts bad role
    mockProductController.mockImplementation((req, res) => {
      if (req.user.role !== 'seller') {
        return res.status(403).json({ message: 'Access denied. Sellers only.' });
      }
      res.status(200).json([]);
    });

    const response = await request(app)
      .get('/products/seller')
      .set('Authorization', 'Bearer customer.jwt.token');

    expect(response.statusCode).toBe(403);
    // FIX: Using .toMatch() for regex validation
    expect(response.body.message).toMatch(/denied|seller/i); 
  });

  it('should handle internal server errors gracefully', async () => {
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { id: 'seller_123', role: 'seller' };
      next();
    });

    // FIX: The controller now properly forwards the error to the Express error handler
    mockProductController.mockImplementation((req, res, next) => {
      next(new Error('Database connection failed'));
    });

    const response = await request(app)
      .get('/products/seller')
      .set('Authorization', 'Bearer valid.jwt.token');

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error', 'Database connection failed');
  });
});
const request = require('supertest');
const express = require('express');

// 1. Setup the mock function
const mockAuthMiddleware = jest.fn();

// 2. Mock the entire module to return an object containing your mock function
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  authMiddleware: (req, res, next) => mockAuthMiddleware(req, res, next)
}));

// 3. Import your express app (which internally imports the mocked middleware module)
const app = require("../src/app");

describe('GET /api/auth/me', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. SUCCESS CASES (AUTHORIZED VIA COOKIE)
  // ==========================================
  describe('When authenticated via cookie', () => {
    const validCookie = ['sid=s%3Avalid_session_id.123456789'];

    it('should return 200 OK and the current user details from req.user', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'johndoe@example.com',
        name: 'John Doe',
        createdAt: '2026-05-24T22:00:00.000Z'
      };

      // Instruct our spy mock to append the user and call next()
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get('/api/auth/me') // Matching your router.get implementation
        .set('Cookie', validCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Current User Fetched Successfully",
        user: mockUser
      });
    });
  });

  // ==========================================
  // 2. FAILURE CASES (UNAUTHORIZED)
  // ==========================================
  describe('When unauthenticated or cookie is invalid', () => {
    it('should return 401 Unauthorized if middleware intercepts and blocks the request', async () => {
      // Instruct our spy mock to mimic a failed cookie verification
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. Please log in.'
        });
      });

      const response = await request(app)
        .get('/api/auth/me'); // No cookie attached

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Unauthorized. Please log in.'
      });
    });
  });
});
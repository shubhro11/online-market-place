const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// 1. Completely mock the Redis module to avoid any production database connections
jest.mock('../src/db/redis', () => ({
  set: jest.fn().mockResolvedValue('OK')
}));

const redisMock = require('../src/db/redis');

// 2. Import your logout controller (Adjust the path to match your project layout)
const authController = require('../src/controllers/auth.controller'); 

// 3. Set up a local test Express app instance
const app = express();
app.use(cookieParser());
app.post('/api/auth/logout', authController.logoutUser);

describe('POST /api/auth/logout', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Case 1: should successfully log out a user with a valid token
  it('should successfully log out a user with a valid token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['token=valid_jwt_token_example']);

    // Verifies token gets blacklisted in Redis
    expect(redisMock.set).toHaveBeenCalledWith(
      'blacklist:valid_jwt_token_example',
      'true',
      'EX',
      86400
    );

    // Verifies response status and message
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'User Logged Out Successfully'
    });

    // Verifies cookie is cleared with proper security configurations
    const cookieHeader = res.headers['set-cookie'][0];
    expect(cookieHeader).toMatch(/token=/);
    expect(cookieHeader).toMatch(/HttpOnly/);
    expect(cookieHeader).toMatch(/Secure/);
    expect(cookieHeader).toMatch(/SameSite=Strict/);
  });

  // Case 2 & 3: should handle missing/expired tokens gracefully 
  // (Based on your code, missing/invalid tokens skip Redis and proceed to clear cookies safely)
  it('should handle missing token safely by clearing cookies and returning 200', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    // Ensure Redis wasn't touched because req.cookies.token doesn't exist
    expect(redisMock.set).not.toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'User Logged Out Successfully'
    });
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
  });

  // Case 4: should handle server errors gracefully
  it('should handle server errors gracefully', async () => {
    // Force your Redis dependency to throw an unhandled rejection error
    redisMock.set.mockRejectedValueOnce(new Error('Redis connection failure'));

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['token=valid_jwt_token_example']);

    // Verifies your try/catch block intercepts the error and responds with 500
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Redis connection failure'
    });
  });
});
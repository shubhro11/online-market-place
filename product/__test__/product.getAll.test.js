require("../tests/setupMocks")
const dbHandler = require('../tests/dbHandler');

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const productModel = require('../src/models/product.model'); 


describe('GET /api/products Integration Tests', () => {
  const mockSellerId = new mongoose.Types.ObjectId();
  let sampleProducts = [];

  beforeAll(async () => {
    await dbHandler.connect();
    // Ensure text index is created in the in-memory database before running tests
    await productModel.ensureIndexes();
  });

  beforeEach(async () => {
    sampleProducts = await productModel.insertMany([
      {
        title: 'Wireless Ergonomic Mouse',
        description: 'High precision 2.4GHz wireless mouse with adjustable DPI.',
        price: { amount: 1500, currency: 'INR' },
        seller: mockSellerId,
        images: [{ url: 'https://example.com/m1.jpg', thumbnail: 'https://example.com/m1_t.jpg', id: 'img1' }]
      },
      {
        title: 'Mechanical Gaming Keyboard',
        description: 'RGB backlit mechanical keyboard with tactile blue switches.',
        price: { amount: 4500, currency: 'INR' },
        seller: mockSellerId,
        images: [{ url: 'https://example.com/k1.jpg', thumbnail: 'https://example.com/k1_t.jpg', id: 'img2' }]
      },
      {
        title: 'USB-C Hub Adapter',
        description: '6-in-1 aluminum space gray hub with 4K HDMI and power delivery.',
        price: { amount: 2500, currency: 'INR' },
        seller: mockSellerId,
        images: []
      }
    ]);
  });

  afterEach(async () => await dbHandler.clearDatabase());
  afterAll(async () => await dbHandler.closeDatabase());

  
  // --- SUCCESS CASES ---
  test('should return all products with default pagination when no query parameters are provided', async () => {
    const res = await request(app)
      .get('/api/products')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: expect.any(Array)
    });
    expect(res.body.data.length).toBe(3);
  });

  test('should filter products using text search on title and description', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ q: 'Wireless' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Wireless Ergonomic Mouse');
  });

  test('should filter products accurately within a specified price range', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ minprice: 2000, maxprice: 5000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    
    const titles = res.body.data.map(p => p.title);
    expect(titles).toContain('Mechanical Gaming Keyboard');
    expect(titles).toContain('USB-C Hub Adapter');
    expect(titles).not.toContain('Wireless Ergonomic Mouse');
  });

  test('should apply strict minimum price filter boundary correctly', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ minprice: 4500 })
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Mechanical Gaming Keyboard');
  });

  test('should apply strict maximum price filter boundary correctly', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ maxprice: 1500 })
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Wireless Ergonomic Mouse');
  });

  test('should respect pagination parameters skip and limit strictly', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ skip: 1, limit: 1 })
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Mechanical Gaming Keyboard');
  });

  // --- FAILURE / VALIDATION CASES ---

  test('should return an empty array gracefully when text search terms match no records', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ q: 'NonExistentProductKeyword' })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: []
    });
  });

  test('should return an empty array gracefully when price boundaries yield no results', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ minprice: 10000, maxprice: 20000 })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: []
    });
  });
  
});
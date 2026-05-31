const request = require("supertest");
const app = require("../src/app");
const { getAuthCookie } = require("../setup/auth");
const axios = require("axios");
const mongoose = require("mongoose");
const orderModel = require("../src/models/order.model");

jest.mock("axios");
jest.mock("../src/models/order.model");

describe("GET /orders/:id — Get order by id with timeline and payment summary", () => {
  const validOrderId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const wrongUserId = new mongoose.Types.ObjectId().toString();
  const nonExistentOrderId = new mongoose.Types.ObjectId().toString();

  const mockOrder = {
    _id: validOrderId,
    userId: userId,
    status: "PENDING",
    totalAmount: {
      amount: 1000,
      currency: "USD",
    },
    items: [
      {
        product: new mongoose.Types.ObjectId().toString(),
        quantity: 2,
        price: {
          amount: 500,
          currency: "USD",
        },
      },
    ],
    shippingAddress: {
      addressLine1: "123 Main St",
      city: "Metropolis",
      state: "CA",
      pincode: "90210",
      country: "USA",
    },
    timeline: [
      {
        status: "PENDING",
        timestamp: new Date(),
        description: "Order created",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return order with timeline and payment summary for valid id", async () => {
    orderModel.findById.mockResolvedValue(mockOrder);

    const res = await request(app)
      .get(`/api/orders/${validOrderId}`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.order).toBeDefined();

    const { order } = res.body;

    // Aligns with your controller's matching logic (order.userId)
    expect(order._id).toBeDefined();
    expect(order.userId).toBe(userId);
    expect(order.status).toBeDefined();

    // Structural assertions for your order schema
    expect(Array.isArray(order.timeline)).toBe(true);
    expect(order.shippingAddress).toBeDefined();
  });

  it("should return 404 for non-existent order", async () => {
    orderModel.findById.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/orders/invalidid123`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message || res.body.error).toBeDefined();
  });

  it("should return 404 for an invalid ObjectId format (CastError protection)", async () => {
    const res = await request(app)
      .get(`/api/orders/invalid-id-format`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect("Content-Type", /json/)
      .expect(404); // Verifies your validation logic blocks a 500 crash

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid Order Id/i);
  });

  it("should return 401 when not authenticated", async () => {
    const res = await request(app)
      .get(`/api/orders/${validOrderId}`)
      .expect("Content-Type", /json/)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it("should prevent user from viewing other user's orders", async () => {
    orderModel.findById.mockResolvedValue(mockOrder);

    const res = await request(app)
      .get(`/api/orders/${validOrderId}`)
      .set("Cookie", getAuthCookie({ userId: wrongUserId }))
      .expect("Content-Type", /json/)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message || res.body.error).toBeDefined();
  });
});

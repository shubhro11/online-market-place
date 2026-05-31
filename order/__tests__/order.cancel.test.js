const request = require("supertest");
const app = require("../src/app");
const { getAuthCookie } = require("../setup/auth");
const mongoose = require("mongoose");
const orderModel = require("../src/models/order.model");

jest.mock("../src/models/order.model");

describe("POST /orders/:id/cancel — Buyer-initiated cancel while pending/paid rules apply", () => {
  const validOrderId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  // Clean mock factory mirroring your exact controller document updates
  const createMockOrder = (status = "PENDING") => ({
    _id: validOrderId,
    userId: userId,
    status: status,
    totalAmount: { amount: 1000, currency: "USD" },
    items: [],
    shippingAddress: {},
    save: jest.fn().mockImplementation(function () {
      this.status = "CANCELLED";
      return Promise.resolve(this);
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- SUCCESS PATHS ---

  it("should cancel order with PENDING status", async () => {
    orderModel.findById.mockResolvedValue(createMockOrder("PENDING"));

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe("CANCELLED");
  });

  // --- STATE GUARD PATHS (409 CONFLICTS) ---

  it("should return 409 when trying to cancel order with PAID status", async () => {
    orderModel.findById.mockResolvedValue(createMockOrder("PAID"));

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Order cannot be cancelled at this stage");
  });

  it("should return 409 when trying to cancel already SHIPPED order", async () => {
    orderModel.findById.mockResolvedValue(createMockOrder("SHIPPED"));

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(409);

    expect(res.body.message).toBe("Order cannot be cancelled at this stage");
  });

  it("should return 409 when trying to cancel already DELIVERED order", async () => {
    orderModel.findById.mockResolvedValue(createMockOrder("DELIVERED"));

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(409);

    expect(res.body.message).toBe("Order cannot be cancelled at this stage");
  });

  // --- AUTH AND PERMISSIONS ---

  it("should return 401 when not authenticated", async () => {
    await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .expect(401);
  });

  it("should prevent user from cancelling other user's orders", async () => {
    orderModel.findById.mockResolvedValue(createMockOrder("PENDING"));

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId: otherUserId }))
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Forbidden");
  });

  // --- VALIDATION AND NOT FOUND ---

  it("should return 404 for an invalid MongoDB ObjectId string", async () => {
    const res = await request(app)
      .post(`/api/orders/not-a-valid-id/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid Order Id");
  });

  it("should return 404 for non-existent order", async () => {
    orderModel.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/orders/${validOrderId}/cancel`)
      .set("Cookie", getAuthCookie({ userId }))
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Order not found");
  });
});
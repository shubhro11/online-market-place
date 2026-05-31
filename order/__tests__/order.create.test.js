const request = require("supertest");
const app = require("../src/app");
const { getAuthCookie } = require("../setup/auth");
const axios = require("axios");

jest.mock("axios");

describe("POST /api/orders — Create order from current cart", () => {
  const sampleAddress = {
    addressLine1: "123 Main St",
    addressLine2: "test_line_2",
    city: "Metropolis",
    state: "CA",
    pincode: "90210",
    country: "USA",
    addressType: "home",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful mocks for microservices
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/cart/")) {
        return Promise.resolve({
          data: {
            cart: {
              items: [
                {
                  productId: "507f1f77bcf86cd799439011",
                  quantity: 2,
                },
              ],
            },
          },
        });
      }

      if (url.includes("/api/products/")) {
        return Promise.resolve({
          data: {
            product: {
              _id: "507f1f77bcf86cd799439011",
              title: "Test Product",
              stock: 10,
              price: {
                amount: 100,
                currency: "USD",
              },
            },
          },
        });
      }
    });
  });

  it("creates order from current cart, computes totals, and sets status=PENDING", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", getAuthCookie())
      .send({ shippingAddress: sampleAddress }) // Wrapped inside shippingAddress matching req.body hierarchy
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.order).toBeDefined();
    
    const { order } = res.body;
    expect(order.userId).toBeDefined();
    expect(order.status).toBe("PENDING");

    // Items copied and priced accurately
    expect(Array.isArray(order.items)).toBe(true);
    expect(order.items.length).toBe(1);
    expect(order.items[0].product).toBe("507f1f77bcf86cd799439011");
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].price.amount).toBe(200); // 100 * 2
    expect(order.items[0].price.currency).toBe("USD");

    // Total calculations verified
    expect(order.totalAmount).toBeDefined();
    expect(order.totalAmount.amount).toBe(200);
    expect(order.totalAmount.currency).toBe("USD");

    // Shipping address payload assertion
    expect(order.shippingAddress).toMatchObject({
      addressLine1: sampleAddress.addressLine1,
      addressLine2: sampleAddress.addressLine2,
      city: sampleAddress.city,
      state: sampleAddress.state,
      pincode: sampleAddress.pincode,
      country: sampleAddress.country,
      addressType: sampleAddress.addressType,
    });
  });

  it("returns 400 when the cart is empty", async () => {
    // Override cart response to return an empty array
    axios.get.mockImplementationOnce((url) => {
      if (url.includes("/api/cart/")) {
        return Promise.resolve({
          data: { cart: { items: [] } },
        });
      }
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", getAuthCookie())
      .send({ shippingAddress: sampleAddress })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("returns 500 when a product is completely out of stock", async () => {
    // Override product microservice with 0 inventory
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/cart/")) {
        return Promise.resolve({
          data: { cart: { items: [{ productId: "507f1f77bcf86cd799439011", quantity: 2 }] } },
        });
      }
      if (url.includes("/api/products/")) {
        return Promise.resolve({
          data: {
            product: {
              _id: "507f1f77bcf86cd799439011",
              title: "Test Product",
              stock: 0,
              price: { amount: 100, currency: "USD" },
            },
          },
        });
      }
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", getAuthCookie())
      .send({ shippingAddress: sampleAddress })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("is currently out of stock.");
  });

  it("returns 500 when requested quantity exceeds available stock", async () => {
    // Override product to have less stock than requested cart item quantity
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/cart/")) {
        return Promise.resolve({
          data: { cart: { items: [{ productId: "507f1f77bcf86cd799439011", quantity: 5 }] } },
        });
      }
      if (url.includes("/api/products/")) {
        return Promise.resolve({
          data: {
            product: {
              _id: "507f1f77bcf86cd799439011",
              title: "Test Product",
              stock: 2,
              price: { amount: 100, currency: "USD" },
            },
          },
        });
      }
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", getAuthCookie())
      .send({ shippingAddress: sampleAddress })
      .expect("Content-Type", /json/)
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Requested quantity is unavailable");
  });

  it("returns 400 when shipping address fields are missing from req.body", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", getAuthCookie())
      .send({}) // Missing shippingAddress wrapping completely
      .expect("Content-Type", /json/)
      .expect(400);

    // Assert against whatever error structure your validation middleware uses
    expect(res.body.message || res.body.errors || res.body).toBeDefined();
  });
});
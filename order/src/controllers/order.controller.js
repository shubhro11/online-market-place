const orderModel = require("../models/order.model");
const axios = require("axios");
const mongoose = require("mongoose");

// Create an Order
async function createOrder(req, res) {
  const user = req.user;

  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    // fetch user's cart from Cart Service
    const cartResponse = await axios.get("http://localhost:3002/api/cart/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!cartResponse.data.cart.items.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const products = await Promise.all(
      cartResponse.data.cart.items.map(async (item) => {
        return (
          await axios.get(
            `http://localhost:3001/api/products/${item.productId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )
        ).data.product;
      }),
    );

    let priceAmount = 0;
    let priceCurrency = "";

    const orderItems = cartResponse.data.cart.items.map((item, index) => {
      const product = products.find((p) => p._id === item.productId);

      if (product.stock === 0) {
        throw new Error(`${product.title} is currently out of stock.`);
      } else if (product.stock < item.quantity) {
        throw new Error(
          `Requested quantity is unavailable. Only ${product.stock} unit(s) of ${product.title} remain in stock.`,
        );
      }

      const itemTotal = product.price.amount * item.quantity;
      priceAmount += itemTotal;
      priceCurrency = product.price.currency;

      return {
        product: item.productId,
        quantity: item.quantity,
        price: {
          amount: itemTotal,
          currency: product.price.currency,
        },
      };
    });

    const order = await orderModel.create({
      userId: user.id,
      items: orderItems,
      status: "PENDING",
      totalAmount: {
        amount: priceAmount,
        currency: priceCurrency,
      },
      shippingAddress: {
        addressLine1: req.body.shippingAddress.addressLine1,
        addressLine2: req.body.shippingAddress.addressLine2,
        city: req.body.shippingAddress.city,
        state: req.body.shippingAddress.state,
        pincode: req.body.shippingAddress.pincode,
        country: req.body.shippingAddress.country,
        addressType: req.body.shippingAddress.addressType,
      },
    });

    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get All Orders
async function getMyOrders(req, res) {
  const user = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await orderModel
      .find({ userId: user.id })
      .skip(skip)
      .limit(limit)
      .exec();
    const totalOrders = await orderModel.countDocuments({ userId: user.id });

    return res.status(200).json({
      orders,
      meta: {
        total: totalOrders,
        page,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get Order by Id
async function getOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(404).json({
      success: false,
      message: "Invalid Order Id",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this order",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function cancelOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(404).json({
      success: false,
      message: "Invalid Order Id",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this order",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Order cannot be cancelled at this stage",
      });
    }

    order.status = "CANCELLED";
    await order.save();

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateOrderAddress(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(404).json({
      success: false,
      message: "Invalid Order Id",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this order",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Order address cannot be cancelled at this stage",
      });
    }

    order.shippingAddress = {
      addressLine1: req.body.shippingAddress.addressLine1,
      addressLine2: req.body.shippingAddress.addressLine2,
      city: req.body.shippingAddress.city,
      state: req.body.shippingAddress.state,
      pincode: req.body.shippingAddress.pincode,
      country: req.body.shippingAddress.country,
      addressType: req.body.shippingAddress.addressType,
    };
    await order.save()

    return res.status(201).json({
      success: true,
      order,
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrderById,
  updateOrderAddress
};

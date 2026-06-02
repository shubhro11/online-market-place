const axios = require("axios");
const paymentModel = require("../models/payment.model");
const razorpay = require("../services/razorpay.service");

// Create Payment 
async function createPayment(req, res) {
  const user = req.user;
  const orderId = req.params.orderId;

  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    const orderResponse = await axios.get(
      `http://localhost:3003/api/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const price = orderResponse.data.order.totalAmount;

    const razorOrder = await razorpay.orders.create({
      amount: Math.round(price.amount * 100),
      currency: price.currency,
      receipt: `raz_recpt_${orderId}`,
    });

    const payment = await paymentModel.create({
      orderId: orderId,
      razorOrderId: razorOrder.id,
      userId: user.id,
      price: {
        amount: razorOrder.amount,
        currency: razorOrder.currency,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment initiated successfully",
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error.response?.data || error,
    });
  }
}

// Verify Payment
async function verifyPayment(req, res) {
  const { razorOrderId, razorPaymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const {
      validatePaymentVerification,
    } = require("../../node_modules/razorpay/dist/utils/razorpay-utils.js");

    const isValid = validatePaymentVerification({
        order_id: razorOrderId,
        payment_id: razorPaymentId,
      },
      signature,
      secret,
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Signature",
      });
    }

    const payment = await paymentModel.findOne({
      razorOrderId,
      status: "Pending",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    payment.razorPaymentId = razorPaymentId;
    payment.signature = signature;
    payment.status = "Completed";

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error.response?.data || error,
    });
  }
}

module.exports = {
  createPayment,
  verifyPayment,
};

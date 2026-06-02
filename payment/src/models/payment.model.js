const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },

    price: {
      amount: { type: Number, required: true },
      currency: { type: String, enum: ["INR", "USD"], default: "INR", required: true },
    },

    razorPaymentId: { type: String },
    razorOrderId: { type: String, required: true },
    signature: { type: String },

    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
      required: true,
    },
  },
  { timestamps: true },
);

const paymentModel = mongoose.model("payment", paymentSchema);

module.exports = paymentModel;

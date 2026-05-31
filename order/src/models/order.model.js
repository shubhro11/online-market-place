const mongoose = require("mongoose");

// Address subSchema
const addressSchema = new mongoose.Schema({
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250,
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 250,
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  pincode: {
    type: String,
    required: true,
    trim: true,
  },

  country: {
    type: String,
    required: true,
    trim: true,
  },

  addressType: {
    type: String,
    enum: ["home", "work", "other"],
    default: "home",
  },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        price: {
          amount: {
            type: Number,
            required: true,
          },
          currency: {
            type: String,
            enum: ["INR", "USD"],
            default: "INR",
          },
        },
      },
    ],
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
    },
    totalAmount: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        enum: ["INR", "USD"],
        default: "INR",
      },
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
  },
  { timestamps: true },
);

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;

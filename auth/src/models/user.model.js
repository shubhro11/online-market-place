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

  isDefault: {
    type: Boolean,
    default: false,
  },
});

// Main userSchema
const userSchema = new mongoose.Schema({
  fullName: {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "seller"],
    default: "user",
  },
  addresses: {
    addressSchema,
  },
});

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;

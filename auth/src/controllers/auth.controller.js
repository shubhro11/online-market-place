const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const redis = require("../db/redis");

// Register User
async function registerUser(req, res) {
  const {
    fullName: { firstName, middleName, lastName },
    username,
    email,
    password,
    role
  } = req.body;

  try {
    // Check whether user already exists
    const userExists = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Password Hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      fullName: { firstName, middleName, lastName },
      username,
      email,
      password: hashedPassword,
      role: role || 'user' // Default role is "user"
    });

    // Generating Token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Login User
async function loginUser(req, res) {
  const { username, email, password } = req.body;

  try {
    // find user with password selected
    const user = await userModel
      .findOne({ $or: [{ username }, { email }] })
      .select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect Pasword",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "User Logged-in Successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Current User
async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    message: "Current User Fetched Successfully",
    user: req.user,
  });
}

// Logout User
async function logoutUser(req, res) {
  const token = req.cookies.token;

  try {
    if (token) {
      await redis.set(`blacklist:${token}`, "true", "EX", 24 * 60 * 60);
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "User Logged Out Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get User Addresses
async function getUserAddresses(req, res) {
  const id = req.user.id;

  try {
    const user = await userModel.findById(id).select("addresses");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Addresses Fetched Successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Add New Address
async function addNewUserAddress(req, res) {
  const id = req.user.id;

  const {
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    country,
    addressType,
    isDefault,
  } = req.body;

  try {
    const user = await userModel.findOneAndUpdate(
      { _id: id },
      {
        $push: {
          addresses: {
            addressLine1,
            addressLine2,
            city,
            state,
            pincode,
            country,
            addressType,
            isDefault,
          },
        },
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "New Address Added Successfully",
      addresses: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Delete User Address
async function deleteUserAddress(req, res) {
  const id = req.user.id;

  const { addressId } = req.params;

  try {
    // Check whether address exists for this user
    const addressPrevExists = await userModel.findOne({
      _id: id,
      "addresses._id": addressId,
    });

    if (!addressPrevExists) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Remove address
    const user = await userModel.findOneAndUpdate(
      { _id: id },
      {
        $pull: {
          addresses: { _id: addressId },
        },
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify deletion
    const addressExists = user.addresses.some(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressExists) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete address",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address Deleted Successfully",
      addresses: user.addresses,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addNewUserAddress,
  deleteUserAddress,
};

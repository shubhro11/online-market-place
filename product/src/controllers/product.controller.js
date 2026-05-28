const mongoose = require("mongoose");
const productModel = require("../models/product.model");
const uploadImage = require("../services/imagekit.service");

// Add a New Product
async function createProduct(req, res) {
  const { title, description, amount, currency = "INR" } = req.body;

  const seller = req.user.id;

  try {
    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "You can upload a maximum of 5 images only.",
      });
    }

    // Check
    const existingProduct = await productModel.findOne({ title, seller });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "A product with this title already exists in your inventory.",
      });
    }

    let images = await Promise.all(
      (req.files || []).map((file) => uploadImage({ buffer: file.buffer })),
    );

    const product = await productModel.create({
      title,
      description,
      price: { amount, currency },
      seller,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Product created",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get products with filters
async function getProducts(req, res) {
  const { q, minprice, maxprice, skip = 0, limit = 0 } = req.query;

  const filter = {};

  if (q) filter.$text = { $search: q };

  if (minprice)
    filter["price.amount"] = {
      ...filter["price.amount"],
      $gte: Number(minprice),
    };

  if (maxprice)
    filter["price.amount"] = {
      ...filter["price.amount"],
      $lte: Number(maxprice),
    };

  const products = await productModel
    .find(filter)
    .skip(Number(skip))
    .limit(Math.min(Number(limit), 20));

  return res.status(200).json({
    success: true,
    data: products,
  });
}

// Get product by Id
async function getProductById(req, res) {
  const { id } = req.params;

  try {
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Update product
async function updateProduct(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const product = await productModel.findOne({
      _id: id,
      seller: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const allowedUpdates = ["title", "description", "price"];

    for (const key of Object.keys(req.body)) {
      if (allowedUpdates.includes(key)) {
        if (key === "price" && typeof req.body.price === "object") {
          if (req.body.price.amount !== undefined) {
            product.price.amount = Number(req.body.price.amount);
          }

          if (req.body.price.currency !== undefined) {
            product.price.currency = req.body.price.currency;
          }
        } else {
          // Updates top-level string fields safely (title, description)
          product[key] = req.body[key];
        }
      }
    }

    // 3. Persist modifications to the database (Runs Mongoose schema validation)
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Delete product
async function deleteProduct(req, res) {
  const { id } = req.params;

  // Check if id is valid or no
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    // Check is the product is associated with the seller
    const product = await productModel.findOne({
      _id: id,
    });

    // When product against the id is not found
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify ownership
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only delete your own products",
      });
    }

    await productModel.findOneAndDelete({ _id: id });
    return res.status(200).json({
      success: true,
      message: "Product successfully deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get Products by Seller
async function getProductsBySeller(req, res) {
  const seller = req.user;

  const { skip = 0, limit = 20 } = req.query;

  try {

    const product = await productModel
      .find({ seller: seller.id })
      .skip(skip)
      .limit(Math.min(limit, 20));

    return res.status(200).json({
      success: true,
      data: products,
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
};

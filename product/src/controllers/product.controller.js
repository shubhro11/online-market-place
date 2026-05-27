const productModel = require("../models/product.model");
const uploadImage = require("../services/imagekit.service");

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


module.exports = {
  createProduct, 

};

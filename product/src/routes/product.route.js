const express = require("express");
const multer = require("multer");
const validators = require("../validators/products.validators");
const productController = require("../controllers/product.controller");
const middlewares = require("../middlewares/auth.middleware");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/products/
router.post("/", middlewares.AuthMiddleware(["admin", "seller"]), upload.array("images", 6), validators.ProductValidation, productController.createProduct,
);

// GET /api/products/
router.get("/", productController.getProducts);


// GET /api/products/seller
router.get("/seller", middlewares.AuthMiddleware(["seller"]), productController.getProductsBySeller)



/* Dynamic Routes  */

// GET /api/products/:id
router.get("/:id", productController.getProductById);

// PATCH /api/products/:id
router.patch("/:id", middlewares.AuthMiddleware(["seller"]), validators.updateProductValidation, productController.updateProduct);

// DELETE /api/products/:id
router.delete("/:id", middlewares.AuthMiddleware(["seller"]), productController.deleteProduct);

module.exports = router;

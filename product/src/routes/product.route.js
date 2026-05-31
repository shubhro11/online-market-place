const express = require("express");
const multer = require("multer");
const validator = require("../validators/product.validator");
const productController = require("../controllers/product.controller");
const middleware = require("../middlewares/auth.middleware");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/products => /
router.post("/", middleware.AuthMiddleware(["admin", "seller"]), upload.array("images", 6), validator.ProductValidation, productController.createProduct,
);

// GET /api/products => /
router.get("/", productController.getProducts);


// GET /api/products => /seller
router.get("/seller", middleware.AuthMiddleware(["seller"]), productController.getProductsBySeller)



/* Dynamic Routes  */

// GET /api/products => /:id
router.get("/:id", productController.getProductById);


// PATCH /api/products => /:id
router.patch("/:id", middleware.AuthMiddleware(["seller"]), validator.updateProductValidation, productController.updateProduct);


// DELETE /api/products => /:id
router.delete("/:id", middleware.AuthMiddleware(["seller"]), productController.deleteProduct);


module.exports = router;

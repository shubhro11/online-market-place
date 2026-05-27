const express = require("express");
const multer = require("multer");
const validators = require("../validators/products.validators")
const productController = require("../controllers/product.controller");
const middlewares = require("../middlewares/auth.middleware")

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/products/
router.post(
  "/",
  middlewares.createAuthMiddleware(["admin", "seller"]),
  upload.array("images", 6), 
  validators.createProductValidation,
  productController.createProduct
);



module.exports = router;

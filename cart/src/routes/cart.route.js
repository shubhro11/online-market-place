const express = require("express");
const middleware = require("../middlewares/auth.middleware");
const validator = require("../validators/cart.validator");
const cartController = require("../controllers/cart.controller");

const router = express.Router();

// GET => /api/cart => /
router.get("/", middleware.AuthMiddleware, cartController.getCart)


// POST => /api/cart => /items
router.post(
  "/items",
  middleware.AuthMiddleware,
  validator.validateCart,
  cartController.addItemToCart,
);

router.patch(
  "/items/:productId",
  middleware.AuthMiddleware,
  validator.validateCartUpdate,
  cartController.updateItemQuantity,
);

module.exports = router;

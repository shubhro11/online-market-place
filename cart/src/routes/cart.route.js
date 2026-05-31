const express = require("express");
const middleware = require("../middlewares/auth.middleware");
const validator = require("../validators/cart.validator");
const cartController = require("../controllers/cart.controller");

const router = express.Router();

// GET => /api/cart => /
router.get("/", middleware.AuthMiddleware([ "user" ]), cartController.getCart)


// POST => /api/cart => /items
router.post(
  "/items",
  middleware.AuthMiddleware([ "user" ]),
  validator.validateCart,
  cartController.addItemToCart,
);


// POST => /api/cart => /items/:productId
router.patch(
  "/items/:productId",
  middleware.AuthMiddleware([ "user" ]),
  validator.validateCartUpdate,
  cartController.updateItemQuantity,
);

module.exports = router;

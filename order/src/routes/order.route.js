const express = require("express");
const middleware = require("../middlewares/auth.middleware")
const validator = require("../validators/order.validator")
const orderController = require("../controllers/order.controller");


const router = express.Router();


// POST /api/orders => /
router.post("/", middleware.AuthMiddleware([ "user" ]), validator.orderAddressValidation, orderController.createOrder)


// GET /api/orders => /me
router.get("/me", middleware.AuthMiddleware([ "user" ]), orderController.getMyOrders)


// POST /api/orders => /:id/cancel
router.post("/:id/cancel", middleware.AuthMiddleware([ "user" ]), orderController.cancelOrderById)


// PATCH /api/orders => /:id/address
router.patch("/:id/address", middleware.AuthMiddleware([ "user" ]), validator.orderAddressValidation, orderController.updateOrderAddress)



// GET /api/orders => /:id
router.get("/:id", middleware.AuthMiddleware([ "user", "admin" ]), orderController.getOrderById)



module.exports = router;

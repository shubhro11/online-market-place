const express = require("express")
const middleware = require("../middlewares/auth.middleware")
const paymentController = require("../controllers/payment.controller")

const router = express.Router()

// POST /api/payments => /create/:orderId
router.post("/create/:orderId", middleware.AuthMiddleware([ "user" ]), paymentController.createPayment)


// POST /api/payments => /verify
router.post("/verify", middleware.AuthMiddleware([ "user" ]), paymentController.verifyPayment)



module.exports = router
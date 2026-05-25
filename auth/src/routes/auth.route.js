const express = require("express")
const validators = require("../middlewares/validation.middleware")
const authController = require("../controllers/auth.controller")
const middlewares = require("../middlewares/auth.middleware")

const router = express.Router()


// POST /auth/register
router.post("/register", validators.registerUserValidations, authController.registerUser)


// POST /auth/login
router.post("/login", validators.loginUserValidations, authController.loginUser)


// GET /auth/me (Protected)
router.get("/me", middlewares.authMiddleware, authController.getCurrentUser)


// GET /auth/logout
router.get("/logout", authController.logoutUser)


// GET /auth/users/me/addresses (Protected)
router.get("/users/me/addresses", middlewares.authMiddleware, authController.getUserAddresses) 


// POST /auth/users/me/addresses (Protected)
router.post("/users/me/addresses", middlewares.authMiddleware, validators.addUserAddressValidations, authController.addNewUserAddress)


// DELETE /auth/users/me/addresses/:addressId (Protected)
router.delete("/users/me/addresses/:addressId", middlewares.authMiddleware, authController.deleteUserAddress)


module.exports = router
const express = require("express")
const validators = require("../validators/user.validators")
const authController = require("../controllers/auth.controller")
const middlewares = require("../middlewares/auth.middleware")

const router = express.Router()


// POST /api/auth => /register
router.post("/register", validators.registerUserValidations, authController.registerUser)


// POST /api/auth => /login
router.post("/login", validators.loginUserValidations, authController.loginUser)


// GET /api/auth => /me (Protected)
router.get("/me", middlewares.authMiddleware, authController.getCurrentUser)


// GET /api/auth => /logout
router.get("/logout", authController.logoutUser)


// GET /api/auth => /users/me/addresses -------- (Protected)
router.get("/users/me/addresses", middlewares.authMiddleware, authController.getUserAddresses) 


// POST /api/auth => /users/me/addresses -------- (Protected)
router.post("/users/me/addresses", middlewares.authMiddleware, validators.addUserAddressValidations, authController.addNewUserAddress)


// DELETE /api/auth => /users/me/addresses/:addressId -------- (Protected)
router.delete("/users/me/addresses/:addressId", middlewares.authMiddleware, authController.deleteUserAddress)


module.exports = router
const { body, validationResult } = require("express-validator");

const validationErrorResponse = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

const orderAddressValidation = [
  body("shippingAddress.addressLine1")
    .trim()
    .notEmpty()
    .withMessage("Address Line 1 is required")
    .isLength({ min: 5, max: 250 }),

  body("shippingAddress.addressLine2")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 250 }),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ min: 2, max: 150 })
    .withMessage("City must be between 2 and 150 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("City contains invalid characters"),

  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("State must be between 2 and 100 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("State contains invalid characters"),

  body("shippingAddress.pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required")
    .matches(/^\d{5,6}$/)
    .withMessage("Pincode must be 5 or 6 digits"),

  body("shippingAddress.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("Country contains invalid characters"),

  body("shippingAddress.addressType")
    .optional()
    .isIn(["home", "work", "other"])
    .withMessage("Address type must be home, work, or other"),

  validationErrorResponse,
];

module.exports = {
  orderAddressValidation,
};

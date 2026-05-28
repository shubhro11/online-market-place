const { body, validationResult } = require("express-validator");

const validationErrorResponse = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// Create Product Validation
const ProductValidation = [
  body("title").trim().isString().notEmpty().withMessage("Title is required"),

  body("description")
    .optional()
    .trim()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Description must be within 1000 characters"),

  body("amount")
    .notEmpty()
    .withMessage("Price amount is required")
    .isNumeric()
    .isFloat({ gt: 0 })
    .withMessage("Price must be a number & should be greater than 0"),

  body("currency")
    .optional()
    .isIn(["USD", "INR"])
    .withMessage("Currency must be USD or INR"),

  validationErrorResponse,
];

const updateProductValidation = [
  body("title")
    .optional()
    .trim()
    .isString()
    .notEmpty()
    .withMessage("Title is required"),

  body("description")
    .optional()
    .trim()
    .isString()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be within 1000 characters"
    ),

  body("price.amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage(
      "Price must be a number & should be greater than 0"
    ),

  body("price.currency")
    .optional()
    .isIn(["USD", "INR"])
    .withMessage("Currency must be USD or INR"),

  validationErrorResponse,
];

module.exports = {
  ProductValidation,
  updateProductValidation
};

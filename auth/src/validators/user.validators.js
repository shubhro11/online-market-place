const { body, validationResult } = require("express-validator");

const validationErrorResponse = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// For Register
const registerUserValidations = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),

  body("email")
    .trim()

    .notEmpty()
    .withMessage("Email is required")
    .bail()

    .isEmail({
      allow_display_name: false,
      require_tld: true,
      ignore_max_length: false,
    })
    .withMessage("Invalid Email Address")
    .bail()

    .custom((value) => {
      // Defensive type check
      if (typeof value !== "string") {
        throw new Error("Email is malformed");
      }

      // Reject consecutive dots
      if (value.includes("..")) {
        throw new Error("Email is malformed");
      }

      // Extra defensive check
      if (!value.includes("@")) {
        throw new Error("Email is malformed");
      }

      const [localPart] = value.split("@");

      // Reject leading/trailing dots
      if (localPart.startsWith(".") || localPart.endsWith(".")) {
        throw new Error("Email is malformed");
      }

      return true;
    })

    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\/.,:;"'<>~`]).+$/,
    )
    .withMessage(
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
    ),

  body("fullName.firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string"),

  // Optional middle name
  body("fullName.middleName")
    .optional({ checkFalsy: true }) // Skips validation if it is null, undefined, or an empty string
    .trim()
    .isString()
    .withMessage("Middle name must be a string"),

  body("fullName.lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string"),

  body("role")
    .optional()
    .isIn(["user", "seller"])
    .withMessage("Role must be either 'user' or 'seller'"),

  validationErrorResponse,
];

// For Login
const loginUserValidations = [
  body("username")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),

  body("email")
    .optional({ values: "falsy" })
    .trim()

    .isEmail({
      allow_display_name: false,
      require_tld: true,
      ignore_max_length: false,
    })
    .withMessage("Invalid Email Address")
    .bail()

    .custom((value) => {
      // Defensive type check
      if (typeof value !== "string") {
        throw new Error("Email is malformed");
      }

      // Reject consecutive dots
      if (value.includes("..")) {
        throw new Error("Email is malformed");
      }

      // Extra defensive check
      if (!value.includes("@")) {
        throw new Error("Email is malformed");
      }

      const [localPart] = value.split("@");

      // Reject leading/trailing dots
      if (localPart.startsWith(".") || localPart.endsWith(".")) {
        throw new Error("Email is malformed");
      }

      return true;
    })

    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\/.,:;"'<>~`]).+$/,
    )
    .withMessage(
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
    ),

  // Require either username or email
  body().custom((value) => {
    if (!value.email && !value.username) {
      throw new Error("Email or Username is required");
    }

    return true;
  }),

  validationErrorResponse,
];

// Add New Address
const addUserAddressValidations = [
  body("addressLine1")
    .trim()
    .notEmpty()
    .withMessage("Address Line 1 is required")
    .isLength({ min: 5, max: 250 }),

  body("addressLine2")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 250 }),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ min: 2, max: 150 })
    .withMessage("City must be between 2 and 150 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("City contains invalid characters"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("State must be between 2 and 100 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("State contains invalid characters"),

  body("pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required")
    .matches(/^\d{5,6}$/)
    .withMessage("Pincode must be 5 or 6 digits"),

  body("country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters")
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage("Country contains invalid characters"),

  validationErrorResponse,
];

module.exports = {
  registerUserValidations,
  loginUserValidations,
  addUserAddressValidations,
};

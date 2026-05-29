const jwt = require("jsonwebtoken");

function AuthMiddleware(roles = ["user"]) {
  return function authMiddleware(req, res, next) {
    const token =
      req.cookies?.token ||
      (req.headers?.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access: No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!roles.includes(decoded.role)) {
        x;
        return res.status(403).json({
          success: false,
          message: "Forbidden: Insufficient permissions",
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access: Invalid Token",
      });
    }
  };
}

module.exports = { AuthMiddleware };

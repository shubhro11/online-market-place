const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized Access - Missing Token",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = decoded;
    req.user = user;
    next();
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized Access",
    });
  }
}


module.exports = {
    authMiddleware
}
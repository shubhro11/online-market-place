const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

// Routes
const authRoutes = require("./routes/auth.route")



// Middlewares
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)


module.exports = app
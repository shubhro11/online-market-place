const cookieParser = require("cookie-parser")
const express = require("express")

const paymentRoutes = require("./routes/payment.route")

const app = express()


app.use(express.json())
app.use(cookieParser())


app.use("/api/payments", paymentRoutes)


module.exports = app
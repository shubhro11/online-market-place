require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/db/db")
connectToDB()


app.listen(3002, () => console.log("Cart Service running on Port 3002"))
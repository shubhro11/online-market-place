require("dotenv").config()

const app = require("./src/app")
const connectDB = require("./src/db/db")

connectDB()


const servicePort = process.env.SERVICE_PORT || 3002;

app.listen(servicePort, () =>
  console.log(`Cart Service is running on Port ${servicePort}`),
);
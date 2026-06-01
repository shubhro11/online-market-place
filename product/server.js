require("dotenv").config()

const app = require("./src/app")
const connectDB = require("./src/db/db")

connectDB()


const servicePort = process.env.SERVICE_PORT || 3001;

app.listen(servicePort, () =>
  console.log(`Product Service is running on Port ${servicePort}`),
);
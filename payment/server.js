require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");

connectDB()


const servicePort = process.env.SERVICE_PORT || 3004;

app.listen(servicePort, () =>
  console.log(`Payment Service is running on Port ${servicePort}`),
);

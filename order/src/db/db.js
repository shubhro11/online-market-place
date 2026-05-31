const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.log("Error occurred while connecting to DB:", error);
  }
}

module.exports = connectDB;

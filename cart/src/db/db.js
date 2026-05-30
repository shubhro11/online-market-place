const mongoose = require("mongoose");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connect to Database");
  } catch (error) {
    console.log("Error connecting to Database:", error);
  }
}

module.exports = connectToDB

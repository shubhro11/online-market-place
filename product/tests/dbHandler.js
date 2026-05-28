const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_fallback_jwt_secret_key_12345';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test_fallback';

let mongoServer;

// Connect to the in-memory database.
const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Assign to the environment variable your app expects
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  console.log("Connected to Database")
};

// Remove all data from all collections.
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Drop database, close the connection and stop the server.
const closeDatabase = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

module.exports = { connect, closeDatabase, clearDatabase };
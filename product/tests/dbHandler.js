const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database.
 */
const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Assign to the environment variable your app expects
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test_fallback_jwt_secret_key_12345';

  await mongoose.connect(uri);
  console.log("Connected to Database")
};

/**
 * Drop database, close the connection and stop the server.
 */
const closeDatabase = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

/**
 * Remove all data from all collections.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  connect,
  closeDatabase,
  clearDatabase
};
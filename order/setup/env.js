
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test-db-skip-real';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ebf679842edd56d1f83e52c7d71b2fd41c5c25a91a7dcbd1c5ce48cc1cfb2ad5df596d6a52f87b27';
process.env.JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token';
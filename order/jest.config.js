/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testTimeout: 15000,
  forceExit: true,
  testMatch: ["**/__tests__/**/*.js?(x)", "**/?(*.)+(spec|test).js?(x)"],
  coveragePathIgnorePatterns: ["/node_modules/", "/jest.config.js"],
  setupFilesAfterEnv: ["<rootDir>/setup/env.js", "<rootDir>/setup/mongodb.js"],
  verbose: true,
  clearMocks: true,
};

module.exports = config;

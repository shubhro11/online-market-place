//  ======================================
// MOCKING REDIS DATABASE CLIENT
//  ======================================

jest.mock('../src/db/redis', () => ({
  set: jest.fn().mockResolvedValue('OK')
}));


// =======================================
// AUTOMATIC MOCK RESETTER
// =======================================
afterEach(() => {
  jest.clearAllMocks();
});
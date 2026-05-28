// =========================================================================
// 1. MOCKING IMAGEKIT SERVICE
// =========================================================================
// Intercepts your application's custom file uploader wrapper service
jest.mock('../src/services/imagekit.service.js', () => {
  // Shared mock return payload expected by your database documents
  const defaultResponse = {
    url: 'https://ik.imagekit.io/mock/test-image.jpg',
    thumbnail: 'https://ik.imagekit.io/mock/test-image_thumb.jpg',
    id: 'mock_file_id_123'
  };

  // Create a base mock function (Satisfies the POST controller)
  const mockUploader = jest.fn().mockResolvedValue(defaultResponse);

  // Attach the uploadImage property method directly to it (Satisfies the PATCH controller)
  mockUploader.uploadImage = jest.fn().mockResolvedValue(defaultResponse);

  return mockUploader;
});


// =========================================================================
// 2. MOCKING UUID
// =========================================================================
// Keeps package generations universally deterministic across tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-static-uuid-1111-2222')
}));



jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ id: 'seller-123', role: 'SELLER' })
}));


// =========================================================================
// 3. AUTOMATIC MOCK RESETTER
// =========================================================================
afterEach(() => {
  jest.clearAllMocks();
});
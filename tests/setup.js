// Test setup and configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LLM_API_KEY = 'test-api-key';
  process.env.LLM_PROVIDER = 'mock';
});

// Mock console.log to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};
/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration - now covers compiled dist/ files
  collectCoverageFrom: [
    'dist/**/*.js',
    '!dist/**/*.d.ts',
    '!dist/**/*.map',
    '!tests/**',
    '!coverage/**'
  ],

  // Coverage thresholds (global + content branch exception)
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    './dist/content.js': {
      statements: 95,
      branches: 80,
      functions: 95,
      lines: 95
    }
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Module paths for imports
  moduleDirectories: ['node_modules', '<rootDir>'],

  // No transformation needed for CommonJS output
  transform: {},

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration-test-data.js',
    '/tests/integration-test-results.json'
  ]
};

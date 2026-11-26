const kit = require('@ab/mobile-kit/jest');

module.exports = {
  ...require('@ab/testing/jest'),
  setupFiles: [...kit.setupFiles, '<rootDir>/jest.setup.cjs'],
  moduleNameMapper: { ...kit.moduleNameMapper, '^@/(.*)$': '<rootDir>/src/$1' },
};

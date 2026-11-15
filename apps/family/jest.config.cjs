module.exports = {
  ...require('@ab/mobile-kit/jest-config'),
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

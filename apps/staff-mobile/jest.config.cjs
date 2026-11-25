module.exports = {
  ...require('@ab/testing/jest'),
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

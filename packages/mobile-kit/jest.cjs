// The kit's part of an app's jest config. The package exports only its public entries, so a test
// that mocks one kit module (jest.mock('@ab/mobile-kit/lib/http/api')) resolves it here, in jest
// alone: app code still reaches the kit only through its exports, which Metro and the type check
// hold it to.
const { join } = require('node:path');

module.exports = {
  setupFiles: [join(__dirname, 'jest.shared.cjs')],
  moduleNameMapper: { '^@ab/mobile-kit/(.+)$': `${join(__dirname, 'src')}/$1` },
};

// The shared setup first (@ab/mobile-kit: RTL, language, storage, Supabase, connection, tz), then
// this app's audience: the session gate keeps guardians and students (index.ts sets it at boot).
require('@ab/mobile-kit/jest-setup');

jest.mock('@ab/mobile-kit/auth/audience', () => ({
  audience: () => 'family',
  setAudience: jest.fn(),
}));

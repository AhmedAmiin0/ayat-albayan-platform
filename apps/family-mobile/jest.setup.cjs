// After the kit's shared setup (jest.config.cjs: RTL, language, storage, Supabase, connection,
// tz), this app's audience: the session gate keeps guardians and students (index.ts sets it at boot).

jest.mock('@ab/mobile-kit/auth/audience', () => ({
  audience: () => 'family',
  setAudience: jest.fn(),
}));

// The in-app player's media (src/recordings/player): jest has no native audio module. A player
// that never loads; the adapter's own test drives its status by hand.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    setPlaybackRate: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

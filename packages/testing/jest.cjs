// The jest-expo config of both Expo apps and of @ab/mobile-kit; each adds its own setup files.

// Packages that ship untranspiled source, so jest transforms them like the app's own code.
const TRANSFORMED = [
  '\\.pnpm',
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?/.*',
  '@expo-google-fonts/.*',
  'expo-router',
  'standard-navigation',
  '@supabase/.*',
  '@ab/.*',
];

module.exports = {
  preset: 'jest-expo',
  // The first render in a suite pays the cold RN/svg/font transform; under `turbo --force` with
  // every package testing at once that alone can pass jest's 5s default.
  testTimeout: 30000,
  // CI keeps jest's transform cache between runs (ci.yml «test mobile»; transformed code only,
  // keyed by file content and config, never a result). Elsewhere jest's default temp folder.
  ...(process.env.JEST_CACHE_DIR ? { cacheDirectory: process.env.JEST_CACHE_DIR } : {}),
  transformIgnorePatterns: [`node_modules/(?!(${TRANSFORMED.join('|')}))`],
};

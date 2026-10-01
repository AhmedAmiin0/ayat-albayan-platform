module.exports = {
  preset: 'jest-expo',
  // The first render in a suite pays the cold RN/svg/font transform; under `turbo --force` with
  // every package testing at once that alone can pass jest's 5s default.
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|@supabase/.*|@ab/.*))',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

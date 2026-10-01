module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|@supabase/.*|@ab/.*))',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

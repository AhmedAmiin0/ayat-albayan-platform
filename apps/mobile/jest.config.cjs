module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-router|@supabase/.*|@ab/.*))',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

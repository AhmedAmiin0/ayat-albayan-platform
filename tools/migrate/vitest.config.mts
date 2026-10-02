import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Invented teacher directory for every test (real names live only in cache/teachers.json).
    setupFiles: ['src/test-setup.ts'],
  },
});

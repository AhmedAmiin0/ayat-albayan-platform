import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
    fsModuleCache: true,
    // Invented teacher directory for every test (real names live only in cache/teachers.json).
    setupFiles: ['src/test-setup.ts'],
  },
});

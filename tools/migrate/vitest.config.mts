import { testConfig } from '@ab/testing/vitest';

// Invented teacher directory for every test (real names live only in cache/teachers.json).
export default testConfig({ setupFiles: ['src/test-setup.ts'] });

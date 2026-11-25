import { describe, expect, it } from 'vitest';
import { testConfig } from './vitest';

describe('testConfig', () => {
  it('runs node tests from src with the shared transform cache and nothing else', () => {
    expect(testConfig()).toEqual({
      plugins: [],
      test: { include: ['src/**/*.test.{ts,tsx}'], fsModuleCache: true, setupFiles: [] },
    });
  });

  it('runs web tests in jsdom with the test env, stylesheet rule and setup files', () => {
    const { plugins, test } = testConfig({ kind: 'web', setupFiles: ['/kit/setup.ts'] });
    expect(plugins?.map((p) => (p && 'name' in p ? p.name : ''))).toEqual([
      'ab:no-stylesheet-fs-cache',
    ]);
    expect(test).toMatchObject({
      environment: 'jsdom',
      setupFiles: ['/kit/setup.ts'],
      testTimeout: 20_000,
      env: { VITE_SUPABASE_URL: 'http://sb.test', VITE_API_URL: 'http://api.test' },
    });
  });
});

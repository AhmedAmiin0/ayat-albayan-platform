import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const load = (): Record<string, unknown> => {
  const require = createRequire(import.meta.url);
  const path = require.resolve('../jest.cjs');
  Reflect.deleteProperty(require.cache, path);
  return require(path);
};

describe('the jest-expo base', () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, 'JEST_CACHE_DIR');
  });

  it('uses the jest-expo preset and transforms the workspace packages', () => {
    const base = load();
    expect(base).toMatchObject({ preset: 'jest-expo', testTimeout: 30000 });
    expect(String(base.transformIgnorePatterns)).toContain('@ab/.*');
    expect(base).not.toHaveProperty('cacheDirectory');
  });

  it('keeps the transform cache in JEST_CACHE_DIR when CI names one', () => {
    process.env.JEST_CACHE_DIR = '/cache/jest';
    expect(load()).toMatchObject({ cacheDirectory: '/cache/jest' });
  });
});

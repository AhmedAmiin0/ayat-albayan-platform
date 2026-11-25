import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

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

  it('uses the jest-expo preset with a 30 s timeout', () => {
    const base = load();
    expect(base).toMatchObject({ preset: 'jest-expo', testTimeout: 30000 });
    expect(base).not.toHaveProperty('cacheDirectory');
  });

  it('transforms react-native, expo, supabase and the workspace packages, and nothing else', () => {
    const [pattern] = z.array(z.string()).parse(load().transformIgnorePatterns);
    const ignored = (path: string): boolean => new RegExp(pattern ?? '').test(path);
    const transformed = [
      'node_modules/.pnpm/x',
      'node_modules/react-native/index.js',
      'node_modules/jest-react-native/x',
      'node_modules/@react-native-community/x',
      'node_modules/expo-router/x',
      'node_modules/@expo/vector-icons/x',
      'node_modules/@expo-google-fonts/noto/x',
      'node_modules/standard-navigation/x',
      'node_modules/@supabase/supabase-js/x',
      'node_modules/@ab/time/src/x.ts',
    ];
    expect(transformed.filter(ignored)).toEqual([]);
    expect(['node_modules/lodash/x.js', 'node_modules/zod/x.js'].every(ignored)).toBe(true);
  });

  it('keeps the transform cache in JEST_CACHE_DIR when CI names one', () => {
    process.env.JEST_CACHE_DIR = '/cache/jest';
    expect(load()).toMatchObject({ cacheDirectory: '/cache/jest' });
  });
});

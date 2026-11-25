import { describe, expect, it } from 'vitest';
import { isExternal } from '../externals.mjs';

const external = isExternal({ '@ab/core': 'workspace:*', '@nestjs/core': '^10', zod: '^4' });

describe('isExternal', () => {
  it("keeps node built-ins and the api's own dependencies out of the bundle", () => {
    for (const id of [
      'node:fs',
      'fs',
      'path/posix',
      'zod',
      '@nestjs/core',
      '@nestjs/core/injector',
    ]) {
      expect(external(id), id).toBe(true);
    }
  });

  it("inlines workspace packages, their own dependencies and the api's source", () => {
    for (const id of [
      '@ab/core',
      '@ab/core/x',
      'date-fns',
      'zodiac',
      '@nestjs/coreutils',
      './a',
      '/abs/b.ts',
    ]) {
      expect(external(id), id).toBe(false);
    }
  });
});

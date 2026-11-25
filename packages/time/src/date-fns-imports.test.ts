import { describe, expect, it } from 'vitest';

// The date-fns barrel evaluates every function it ships; under per-file test isolation that was
// over a third of the api suite's import time, so runtime imports name one function each.

// Vite's raw import (vitest): the shared lib has no Node typings, so the sources are read this way.
declare global {
  interface ImportMeta {
    glob<T>(
      pattern: string | string[],
      options: { query: '?raw'; import: 'default'; eager: true },
    ): Record<string, T>;
  }
}

const sources = import.meta.glob<string>(['./**/*.ts', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const RUNTIME_BARREL = /^import (?!type )[^;]*from 'date-fns';/m;

describe('date-fns imports', () => {
  it('reads the package sources', () => {
    expect(Object.keys(sources)).toContain('./zone/zoned.ts');
  });

  it('loads each date-fns function from its own subpath, never the barrel', () => {
    const offenders = Object.entries(sources).filter(([, text]) => RUNTIME_BARREL.test(text));
    expect(offenders.map(([path]) => path)).toEqual([]);
  });
});

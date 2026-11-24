import { arabicLiterals } from '@ab/i18n';
import { describe, expect, it } from 'vitest';
import allow from './i18n-literals.allow.json';

// No Arabic in component string literals or JSX text; exceptions go in i18n-literals.allow.json.

const sources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const allowed = new Set(Object.keys(allow.files));

describe('no hard-coded Arabic in apps/staff-web/src', () => {
  it('scans the components', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
  });

  it('every .tsx takes its words from i18n', () => {
    const hits = Object.entries(sources)
      .filter(([path]) => !allowed.has(path.replace(/^\.\//, 'src/')))
      .flatMap(([path, source]) => arabicLiterals(source).map((h) => `${path}:${h.line} ${h.text}`));
    expect(hits).toEqual([]);
  });
});

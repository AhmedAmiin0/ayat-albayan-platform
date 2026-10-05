import { arabicLiterals } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import allow from './i18n-literals.allow.json';

// «Nothing untranslated» (owner, 2026-10-05): no Arabic in string literals or JSX text of the
// app's components. Copy lives in ar.json / en.json (the admins can override it, «الترجمات»).
// A justified exception goes in i18n-literals.allow.json with its reason.

const sources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const allowed = new Set(Object.keys(allow.files));

describe('no hard-coded Arabic in apps/web/src', () => {
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

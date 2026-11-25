import { arabicLiterals } from '@ab/i18n';
import { expect, it } from 'vitest';

// Nothing untranslated: no Arabic in the family pages' string literals or
// JSX text; copy lives in ar.json / en.json.
const sources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx', '!./test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

it('every family-web .tsx takes its words from i18n', () => {
  expect(Object.keys(sources).length).toBeGreaterThan(20);
  const hits = Object.entries(sources).flatMap(([path, source]) =>
    arabicLiterals(source).map((hit) => `${path}:${hit.line} ${hit.text}`),
  );
  expect(hits).toEqual([]);
});

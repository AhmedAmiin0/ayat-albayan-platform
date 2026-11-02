import { expect, it } from 'vitest';
import { highlightParts } from '../replies/saved-reply-text.js';
import { searchSnippet } from './search-snippet.js';

it('a short text is its own snippet, its lines joined', () => {
  expect(searchSnippet('موعد\nالحلقة غدًا', 'الحلقه')).toBe('موعد الحلقة غدًا');
});

it('a long text is cut around the first match with «…» where cut', () => {
  const text = `${'أ'.repeat(100)} كلمة البحث ${'ب'.repeat(100)}`;
  const snip = searchSnippet(text, 'البحث');
  expect(snip.startsWith('…')).toBe(true);
  expect(snip.endsWith('…')).toBe(true);
  expect(snip).toContain('كلمة البحث');
  expect(snip.length).toBeLessThan(100);
});

it('no match in the text (a document name hit): its start', () => {
  expect(searchSnippet('x'.repeat(200), 'zzz').startsWith('xxx')).toBe(true);
});

it('highlight runs fold digits too: «12» marks «١٢» in the bubble', () => {
  expect(highlightParts('الصفحة ١٢', '12').filter((p) => p.match)).toEqual([
    { text: '١٢', match: true },
  ]);
});

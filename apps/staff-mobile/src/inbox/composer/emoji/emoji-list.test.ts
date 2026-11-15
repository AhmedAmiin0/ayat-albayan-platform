import { EMOJI, insertAt } from './emoji-list';

test('about 80 emoji, none twice', () => {
  expect(EMOJI.length).toBeGreaterThanOrEqual(75);
  expect(EMOJI.length).toBeLessThanOrEqual(100);
  expect(new Set(EMOJI).size).toBe(EMOJI.length);
});

describe('insertAt', () => {
  it('at the caret, in Arabic and English text alike; the caret moves past it', () => {
    expect(insertAt('السلام عليكم', { start: 6, end: 6 }, '🌹')).toEqual({ text: 'السلام🌹 عليكم', caret: 8 });
    expect(insertAt('Hi', { start: 2, end: 2 }, '👋')).toEqual({ text: 'Hi👋', caret: 4 });
  });

  it('replaces a selection, and a reversed one', () => {
    expect(insertAt('abcd', { start: 1, end: 3 }, '😀')).toEqual({ text: 'a😀d', caret: 3 });
    expect(insertAt('abcd', { start: 3, end: 1 }, '😀')).toEqual({ text: 'a😀d', caret: 3 });
  });

  it('a stale selection past the end appends', () => {
    expect(insertAt('ab', { start: 9, end: 9 }, '✅')).toEqual({ text: 'ab✅', caret: 3 });
    expect(insertAt('', { start: 0, end: 0 }, '✅')).toEqual({ text: '✅', caret: 1 });
  });
});

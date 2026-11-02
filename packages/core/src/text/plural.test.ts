import { describe, expect, it } from 'vitest';
import { counted, pluralForm } from './plural.js';

describe('pluralForm (Arabic)', () => {
  it.each([
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [10, 'few'],
    [11, 'other'],
    [28, 'other'],
    [103, 'few'],
  ])('%i → %s', (n, form) => {
    expect(pluralForm(n)).toBe(form);
  });

  it('fills {n} into the chosen form', () => {
    const forms = { one: 'حلقة واحدة', two: 'حلقتان', few: '{n} حلقات', other: '{n} حلقة' };
    expect([1, 2, 5, 27].map((n) => counted(forms, n))).toEqual([
      'حلقة واحدة',
      'حلقتان',
      '5 حلقات',
      '27 حلقة',
    ]);
  });

  it('fills every {n} of a form (a count named twice)', () => {
    const forms = { one: 'يوم', two: 'يومان', few: '{n} أيام، لتصبح {n} أيام', other: '{n} يومًا' };
    expect(counted(forms, 3)).toBe('3 أيام، لتصبح 3 أيام');
  });
});

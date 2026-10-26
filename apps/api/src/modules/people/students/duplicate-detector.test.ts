import { describe, expect, it } from 'vitest';
import { detectDuplicates } from './duplicate-detector';

const s = (id: string, name: string) => ({ id, code: `AB-${id}`, name, status: 'trial' as const });

// Siblings already registered under one guardian phone (docs/02 issue A1).
const SIBLINGS = [s('1', 'سهيلة'), s('2', 'جودي'), s('3', 'فاطمة محمد')];

describe('DuplicateDetector (R-STU-03)', () => {
  it.each([
    ['سهيله', '1'], // taa marbuta vs ha
    ['سُهَيْلَة', '1'], // tashkeel
    ['سهيلة', '1'], // exact
    ['جودى', '2'], // alef maqsura vs ya
    ['فاطمه', '3'], // shorter name contained in the longer one
    ['فاطمة محمد خان', '3'], // longer name contains the existing one
  ])('%s matches student %s', (name, id) => {
    expect(detectDuplicates(name, SIBLINGS).map((c) => c.id)).toEqual([id]);
  });

  it('a combined legacy row "جود وسهيله" matches both girls', () => {
    expect(detectDuplicates('جود وسهيله', [s('1', 'سهيلة'), s('2', 'جود')]).map((c) => c.id)).toEqual([
      '1',
      '2',
    ]);
  });

  it('hamza variants match: أحمد ~ احمد ~ إحمد', () => {
    expect(detectDuplicates('احمد', [s('9', 'أحمد'), s('8', 'إحمد')])).toHaveLength(2);
  });

  it('a sibling with a different name is not a duplicate', () => {
    expect(detectDuplicates('مريم', SIBLINGS)).toEqual([]);
  });

  it('no students, no candidates', () => {
    expect(detectDuplicates('سهيلة', [])).toEqual([]);
  });

  it('keeps the full candidate shape for the 409 body', () => {
    expect(detectDuplicates('سهيله', SIBLINGS)).toEqual([SIBLINGS[0]]);
  });
});

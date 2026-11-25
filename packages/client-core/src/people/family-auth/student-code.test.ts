import { expect, test } from 'vitest';
import { studentCodeOnTrack } from './student-code';

test('a whole code, or one on its way, is on track', () => {
  for (const typed of ['AB-1234', 'ab-0183', 'AB1234', 'AB-١٢٣٤', 'ab 1234', 'A', 'AB', 'AB-12']) {
    expect(studentCodeOnTrack(typed)).toBe(true);
  }
});

test('anything else is not', () => {
  for (const typed of ['1234', 'B-1234', 'AB-12x', 'name@mail.com']) {
    expect(studentCodeOnTrack(typed)).toBe(false);
  }
});

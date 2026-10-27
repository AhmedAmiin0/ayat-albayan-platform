import { describe, expect, it } from 'vitest';
import { meridiemLabel } from './clock.js';
import { hourLabel } from './clock-picker.js';

describe('hourLabel', () => {
  it('hour chips in each cycle and language', () => {
    expect(hourLabel(17, '24', 'ar')).toBe('17');
    expect(hourLabel(9, '24', 'en')).toBe('09');
    expect(hourLabel(17, '12', 'ar')).toBe('5 م');
    expect(hourLabel(0, '12', 'en')).toBe('12 AM');
    expect(hourLabel(12, '12', 'ar')).toBe('12 م');
    expect(hourLabel(11, '12', 'en')).toBe('11 AM');
  });
});

describe('meridiemLabel', () => {
  it('ص / م and AM / PM', () => {
    expect(meridiemLabel('am', 'ar')).toBe('ص');
    expect(meridiemLabel('pm', 'ar')).toBe('م');
    expect(meridiemLabel('am', 'en')).toBe('AM');
    expect(meridiemLabel('pm', 'en')).toBe('PM');
  });
});

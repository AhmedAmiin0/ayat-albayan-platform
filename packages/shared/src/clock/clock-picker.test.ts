import { describe, expect, it } from 'vitest';
import { flipMeridiem, fromTwelve, hourLabel, meridiemLabel, toTwelve } from './clock-picker.js';

describe('toTwelve / fromTwelve', () => {
  it.each([
    [0, 12, 'am'],
    [9, 9, 'am'],
    [11, 11, 'am'],
    [12, 12, 'pm'],
    [17, 5, 'pm'],
    [23, 11, 'pm'],
  ] as const)('%i ↔ %i %s', (h24, h12, meridiem) => {
    expect(toTwelve(h24)).toEqual({ hour: h12, meridiem });
    expect(fromTwelve(h12, meridiem)).toBe(h24);
  });
});

describe('labels', () => {
  it('hour chips in each cycle and language', () => {
    expect(hourLabel(17, '24', 'ar')).toBe('17');
    expect(hourLabel(9, '24', 'en')).toBe('09');
    expect(hourLabel(17, '12', 'ar')).toBe('5 م');
    expect(hourLabel(0, '12', 'en')).toBe('12 AM');
  });

  it('meridiem words', () => {
    expect(meridiemLabel('am', 'ar')).toBe('ص');
    expect(meridiemLabel('pm', 'ar')).toBe('م');
    expect(meridiemLabel('am', 'en')).toBe('AM');
    expect(meridiemLabel('pm', 'en')).toBe('PM');
  });

  it('flipMeridiem moves 12 hours within the day', () => {
    expect(flipMeridiem(5)).toBe(17);
    expect(flipMeridiem(17)).toBe(5);
    expect(flipMeridiem(0)).toBe(12);
  });
});

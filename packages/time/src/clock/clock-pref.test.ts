import { describe, expect, it } from 'vitest';
import { CLOCK_PREFS, parseClockPref, resolveHourCycle, uses24FromHourCycle } from './clock-pref.js';

describe('resolveHourCycle', () => {
  it.each([
    ['auto', true, '24'],
    ['auto', false, '12'],
    ['auto', null, '24'],
    ['auto', undefined, '24'],
    ['12', true, '12'],
    ['12', false, '12'],
    ['12', null, '12'],
    ['24', true, '24'],
    ['24', false, '24'],
    ['24', undefined, '24'],
  ] as const)('%s with device 24 h = %s → %s', (pref, device, cycle) => {
    expect(resolveHourCycle(pref, device)).toBe(cycle);
  });
});

describe('parseClockPref', () => {
  it('keeps the three choices', () => {
    for (const pref of CLOCK_PREFS) expect(parseClockPref(pref)).toBe(pref);
  });

  it('reads anything else as auto', () => {
    expect(parseClockPref(null)).toBe('auto');
    expect(parseClockPref('h12')).toBe('auto');
    expect(parseClockPref(12)).toBe('auto');
  });
});

describe('uses24FromHourCycle', () => {
  it('h11 / h12 are 12 h devices; h23 / h24 are 24 h; unknown is null', () => {
    expect(uses24FromHourCycle('h11')).toBe(false);
    expect(uses24FromHourCycle('h12')).toBe(false);
    expect(uses24FromHourCycle('h23')).toBe(true);
    expect(uses24FromHourCycle('h24')).toBe(true);
    expect(uses24FromHourCycle(undefined)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { clockRange, clockRangeHhmm, isolateClock } from './clock.js';

const LRI = '⁦';
const RLI = '⁧';
const PDI = '⁩';

describe('isolateClock', () => {
  it('LTR island for 24 h and for English', () => {
    expect(isolateClock('17:30', '24', 'ar')).toBe(`${LRI}17:30${PDI}`);
    expect(isolateClock('5:30 PM', '12', 'en')).toBe(`${LRI}5:30 PM${PDI}`);
  });

  it('RTL island for Arabic 12 h, so «م» follows the digits for the reader', () => {
    expect(isolateClock('5:30 م', '12', 'ar')).toBe(`${RLI}5:30 م${PDI}`);
  });
});

describe('clockRange / clockRangeHhmm', () => {
  it('24 h keeps today’s «from – to» LTR island', () => {
    expect(clockRangeHhmm('16:00', '18:00', { cycle: '24', locale: 'ar' })).toBe(`${LRI}16:00 – 18:00${PDI}`);
  });

  it('12 h in both languages', () => {
    expect(clockRangeHhmm('16:00', '18:00', { cycle: '12', locale: 'ar' })).toBe(`${RLI}4:00 م – 6:00 م${PDI}`);
    expect(clockRangeHhmm('11:30', '12:15', { cycle: '12', locale: 'en' })).toBe(`${LRI}11:30 AM – 12:15 PM${PDI}`);
  });

  it('joins two clocks formatted elsewhere', () => {
    expect(clockRange('9:00 AM', '10:00 AM', { cycle: '12', locale: 'en' })).toBe(`${LRI}9:00 AM – 10:00 AM${PDI}`);
  });
});

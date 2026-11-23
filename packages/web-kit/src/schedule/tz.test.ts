import { describe, expect, it } from 'vitest';
import { dayMonthLabel } from './tz';

describe('schedule date labels', () => {
  it('dayMonthLabel prints the day with Western digits', () => {
    expect(dayMonthLabel('2026-10-03')).toMatch(/^3 /);
    expect(dayMonthLabel('2026-10-03')).not.toMatch(/[٠-٩]/);
  });
});

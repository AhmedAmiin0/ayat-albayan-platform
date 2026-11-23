import { describe, expect, it } from 'vitest';
import { dayMonthLabel } from '#/schedule/tz/tz.ts';

describe('schedule date labels', () => {
  it('dayMonthLabel prints the day with Western digits', () => {
    expect(dayMonthLabel('2026-10-03')).toMatch(/^3 /);
    expect(dayMonthLabel('2026-10-03')).not.toMatch(/[٠-٩]/);
  });
});

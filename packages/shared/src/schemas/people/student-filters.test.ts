import { describe, expect, it } from 'vitest';
import { parseStatusList, studentListFiltersSchema } from './student-filters.js';

const T = '11111111-1111-4111-8111-111111111111';

describe('studentListFiltersSchema (R-STU-01)', () => {
  it('parses every filter from query-string values', () => {
    const r = studentListFiltersSchema.parse({
      status: 'trial,active',
      teacher: T,
      program: 'quran',
      package: 'low',
      weekly: 'no',
      tz: 'Africa/Cairo',
    });
    expect(r).toEqual({ status: ['trial', 'active'], teacher: T, program: 'quran', package: 'low', weekly: 'no', tz: 'Africa/Cairo' });
  });

  it('blank values mean "not filtered"', () => {
    expect(studentListFiltersSchema.parse({ status: '', teacher: '', program: '', package: '', weekly: '', tz: '' })).toEqual({});
  });

  it('accepts teacher=none (بدون معلم) and rejects junk', () => {
    expect(studentListFiltersSchema.parse({ teacher: 'none' }).teacher).toBe('none');
    expect(studentListFiltersSchema.safeParse({ teacher: 'abc' }).success).toBe(false);
    expect(studentListFiltersSchema.safeParse({ package: 'free' }).success).toBe(false);
    expect(studentListFiltersSchema.safeParse({ weekly: 'maybe' }).success).toBe(false);
  });
});

describe('parseStatusList', () => {
  it('keeps known statuses in enum order, once each; drops unknown', () => {
    expect(parseStatusList('churned, trial,x,trial')).toEqual(['trial', 'churned']);
    expect(parseStatusList(['paused'])).toEqual(['paused']);
  });

  it('nothing known → undefined', () => {
    expect(parseStatusList('x')).toBeUndefined();
    expect(parseStatusList(3)).toBeUndefined();
  });
});

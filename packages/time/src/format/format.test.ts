import { describe, expect, it } from 'vitest';
import { dateRangeText, dateText, engineHourCycle } from './format.js';
import { zonedFieldsIn } from '../zone/index.js';

// The words half of the facade (docs/34 §7): the same strings Intl gave the apps before.

const at = new Date('2026-10-29T21:59:07Z');

describe('dateText / dateRangeText', () => {
  it('names the day in the UI language with ASCII digits, in the zone given', () => {
    const fields = { weekday: 'long', day: 'numeric', month: 'long' } as const;
    expect(dateText(at, { tz: 'Africa/Cairo', locale: 'ar' }, fields)).toBe('الخميس، 29 أكتوبر');
    expect(dateText(at, { tz: 'Asia/Riyadh', locale: 'ar' }, fields)).toBe('الجمعة، 30 أكتوبر');
  });

  it('a range of days says the shared month once, like Intl formatRange', () => {
    const fields = { weekday: 'long', day: 'numeric', month: 'long' } as const;
    const range = { from: new Date('2026-10-10T12:00:00Z'), to: new Date('2026-10-12T12:00:00Z') };
    const opts = { tz: 'UTC', locale: 'ar' } as const;
    const old = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { ...fields, timeZone: 'UTC' });
    expect(dateRangeText(range, opts, fields)).toBe(old.formatRange(range.from, range.to));
    expect(dateRangeText(range, opts, fields)).not.toMatch(/[٠-٩]/);
  });
});

describe('zonedFieldsIn', () => {
  it('reads the wall clock fields, seconds included', () => {
    expect(zonedFieldsIn(at, 'Africa/Cairo')).toEqual({
      year: 2026,
      month: 10,
      day: 29,
      hour: 23,
      minute: 59,
      second: 7,
    });
  });
});

describe('engineHourCycle', () => {
  it('is what Intl resolves for an hour in the default locale', () => {
    const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    expect(engineHourCycle()).toBe(hc);
  });
});

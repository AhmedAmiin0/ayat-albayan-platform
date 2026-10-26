import { describe, expect, it } from 'vitest';
import { chatDay, chatDayKey, dayParts } from './chat-day.js';

const now = new Date('2026-10-27T10:00:00Z'); // a Tuesday
const cairo = { now, tz: 'Africa/Cairo' };
const at = (iso: string) => new Date(iso);

describe('chatDay', () => {
  it('is today, yesterday, then the weekday within the last 6 days', () => {
    expect(chatDay(at('2026-10-27T00:30:00Z'), cairo)).toEqual({ kind: 'today' });
    expect(chatDay(at('2026-10-26T12:00:00Z'), cairo)).toEqual({ kind: 'yesterday' });
    expect(chatDay(at('2026-10-25T12:00:00Z'), cairo)).toEqual({ kind: 'weekday', weekday: 0 });
    expect(chatDay(at('2026-10-21T12:00:00Z'), cairo)).toEqual({ kind: 'weekday', weekday: 3 });
  });

  it('is the date from the 7th day back, with the year only for another year', () => {
    expect(chatDay(at('2026-10-20T12:00:00Z'), cairo)).toEqual({ kind: 'date', day: 20, month: 10, year: null });
    expect(chatDay(at('2026-09-29T12:00:00Z'), cairo)).toEqual({ kind: 'date', day: 29, month: 9, year: null });
    expect(chatDay(at('2025-12-31T12:00:00Z'), cairo)).toEqual({ kind: 'date', day: 31, month: 12, year: 2025 });
  });

  it('counts days in the viewer’s zone around midnight', () => {
    // 22:30 UTC on the 26th is already the 27th in Cairo (UTC+2) but still the 26th in New York.
    const late = at('2026-10-26T22:30:00Z');
    expect(chatDay(late, cairo)).toEqual({ kind: 'today' });
    expect(chatDay(late, { now: at('2026-10-27T14:00:00Z'), tz: 'America/New_York' })).toEqual({ kind: 'yesterday' });
  });

  it('a clock a little ahead (a time after now) shows its date, never a weekday', () => {
    expect(chatDay(at('2026-10-29T12:00:00Z'), cairo)).toEqual({ kind: 'date', day: 29, month: 10, year: null });
  });
});

describe('chatDayKey / dayParts', () => {
  it('is one key per local day', () => {
    expect(chatDayKey(at('2026-10-26T22:30:00Z'), 'Africa/Cairo')).toBe('2026-10-27');
    expect(chatDayKey(at('2026-10-26T22:30:00Z'), 'UTC')).toBe('2026-10-26');
    expect(dayParts(at('2026-01-05T12:00:00Z'), 'UTC')).toEqual({ day: 5, month: 1, year: 2026 });
  });
});

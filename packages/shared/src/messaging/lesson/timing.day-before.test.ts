import { describe, expect, it } from 'vitest';
import { dayBeforeSendAt, reminderDue } from './timing.js';

const at = (iso: string): Date => new Date(iso);
const sendAt = (startsAt: string, tz: string, hhmm: string | null) => dayBeforeSendAt(at(startsAt), tz, hhmm).toISOString();

describe('dayBeforeSendAt with send_at_local (docs/23b §8)', () => {
  it('null equals the default (the lesson’s own time), DST change days included', () => {
    for (const [iso, tz] of [
      ['2026-10-04T14:00:00Z', 'Asia/Riyadh'],
      ['2026-10-30T15:00:00Z', 'Africa/Cairo'],
      ['2026-11-01T15:00:00Z', 'America/New_York'],
      ['2026-03-29T09:00:00Z', 'Europe/London'],
    ] as const) {
      expect(dayBeforeSendAt(at(iso), tz, null).toISOString()).toBe(dayBeforeSendAt(at(iso), tz).toISOString());
    }
  });

  it('Riyadh: 20:00 local on the previous local day', () => {
    // Sun 4 Oct 08:00 Riyadh = 05:00Z → Sat 3 Oct 20:00 Riyadh = 17:00Z.
    expect(sendAt('2026-10-04T05:00:00Z', 'Asia/Riyadh', '20:00')).toBe('2026-10-03T17:00:00.000Z');
  });

  it('the previous LOCAL day, not the previous UTC day', () => {
    // Sun 4 Oct 01:00 Riyadh = Sat 3 Oct 22:00Z → Sat 3 Oct 20:00 Riyadh = 17:00Z.
    expect(sendAt('2026-10-03T22:00:00Z', 'Asia/Riyadh', '20:00')).toBe('2026-10-03T17:00:00.000Z');
  });

  it('Europe/London: the send day is the fall-back day (25 Oct 2026, GMT after)', () => {
    // Mon 26 Oct 10:00 GMT → Sun 25 Oct 20:00 GMT = 20:00Z.
    expect(sendAt('2026-10-26T10:00:00Z', 'Europe/London', '20:00')).toBe('2026-10-25T20:00:00.000Z');
  });

  it('Europe/London: the lesson is on the fall-back day, the send day is still BST', () => {
    // Sun 25 Oct 10:00 GMT → Sat 24 Oct 20:00 BST (UTC+1) = 19:00Z.
    expect(sendAt('2026-10-25T10:00:00Z', 'Europe/London', '20:00')).toBe('2026-10-24T19:00:00.000Z');
  });

  it('Europe/London: the spring-forward day (29 Mar 2026)', () => {
    // Mon 30 Mar 09:00 BST = 08:00Z → Sun 29 Mar 06:00 BST = 05:00Z.
    expect(sendAt('2026-03-30T08:00:00Z', 'Europe/London', '06:00')).toBe('2026-03-29T05:00:00.000Z');
  });

  it('America/New_York: the spring-forward day (8 Mar 2026, EDT after)', () => {
    // Mon 9 Mar 17:00 EDT = 21:00Z → Sun 8 Mar 20:00 EDT (UTC-4) = 9 Mar 00:00Z.
    expect(sendAt('2026-03-09T21:00:00Z', 'America/New_York', '20:00')).toBe('2026-03-09T00:00:00.000Z');
  });

  it('America/New_York: the lesson on the spring-forward day, the send day still EST', () => {
    // Sun 8 Mar 10:00 EDT = 14:00Z → Sat 7 Mar 20:00 EST (UTC-5) = 8 Mar 01:00Z.
    expect(sendAt('2026-03-08T14:00:00Z', 'America/New_York', '20:00')).toBe('2026-03-08T01:00:00.000Z');
  });

  it('America/New_York: the fall-back day (1 Nov 2026)', () => {
    // Mon 2 Nov 10:00 EST = 15:00Z → Sun 1 Nov 21:00 EST = 2 Nov 02:00Z.
    expect(sendAt('2026-11-02T15:00:00Z', 'America/New_York', '21:00')).toBe('2026-11-02T02:00:00.000Z');
  });
});

describe('reminderDue day_before with send_at_local', () => {
  const startsAt = at('2026-10-04T05:00:00Z'); // Sun 08:00 Riyadh
  const due = (now: string, sendAtLocal: string | null) =>
    reminderDue({ kind: 'day_before', startsAt, tz: 'Asia/Riyadh', minutesBefore: 60, sendAtLocal, now: at(now) });

  it.each([
    ['just before 20:00 Saturday', '2026-10-03T16:59:00Z', false],
    ['at 20:00 Saturday', '2026-10-03T17:00:00Z', true],
    ['late Saturday, still «بكرة»', '2026-10-03T20:59:00Z', true],
    ['after local midnight: the lesson is today', '2026-10-03T21:00:00Z', false],
  ] as const)('%s → %s', (_name, now, expected) => {
    expect(due(now, '20:00')).toBe(expected);
  });

  it('null keeps today’s timing: 24 h before', () => {
    expect(due('2026-10-03T04:59:00Z', null)).toBe(false);
    expect(due('2026-10-03T05:00:00Z', null)).toBe(true);
    expect(due('2026-10-03T05:00:00Z', '20:00')).toBe(false);
  });
});

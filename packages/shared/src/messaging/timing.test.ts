import { describe, expect, it } from 'vitest';
import { dayBeforeSendAt, nextFollowUpAt, reminderDue, type FollowUpLead } from './timing.js';

const lead = (over: Partial<FollowUpLead> = {}): FollowUpLead => ({
  status: 'no_reply',
  follow_up_paused: false,
  follow_up_stage: 0,
  last_inbound_at: '2026-10-01T10:00:00Z',
  created_at: '2026-09-30T08:00:00Z',
  ...over,
});
const HOURS = [24, 72];

describe('nextFollowUpAt (R-LEAD-05: 24 h then 72 h after the last message)', () => {
  it.each([
    ['stage 0 → +24 h', {}, '2026-10-02T10:00:00.000Z'],
    ['stage 1 → +72 h', { follow_up_stage: 1 }, '2026-10-04T10:00:00.000Z'],
    ['interested_no_slot too', { status: 'interested_no_slot' as const }, '2026-10-02T10:00:00.000Z'],
    ['no inbound yet → from created_at', { last_inbound_at: null }, '2026-10-01T08:00:00.000Z'],
  ])('%s', (_name, over, at) => {
    expect(nextFollowUpAt(lead(over), HOURS)?.toISOString()).toBe(at);
  });

  it.each([
    ['paused', { follow_up_paused: true }],
    ['all sent', { follow_up_stage: 2 }],
    ['new lead', { status: 'new' as const }],
    ['trial booked', { status: 'trial_booked' as const }],
    ['lost', { status: 'lost' as const }],
  ])('%s → null', (_name, over) => {
    expect(nextFollowUpAt(lead(over), HOURS)).toBeNull();
  });
});

describe('dayBeforeSendAt (same wall-clock, previous local day)', () => {
  it('Riyadh has no DST: exactly 24 h', () => {
    expect(dayBeforeSendAt(new Date('2026-10-04T14:00:00Z'), 'Asia/Riyadh').toISOString()).toBe('2026-10-03T14:00:00.000Z');
  });

  it('Cairo across the 30 Oct 2026 fall-back: 25 h, still 17:00 local', () => {
    // Fri 30 Oct 17:00 Cairo (UTC+2) = 15:00Z; Thu 29 Oct 17:00 Cairo (UTC+3) = 14:00Z.
    expect(dayBeforeSendAt(new Date('2026-10-30T15:00:00Z'), 'Africa/Cairo').toISOString()).toBe('2026-10-29T14:00:00.000Z');
  });

  it('New York across the 1 Nov 2026 fall-back', () => {
    // Sun 1 Nov 10:00 EST (UTC-5) = 15:00Z; Sat 31 Oct 10:00 EDT (UTC-4) = 14:00Z: 25 h.
    expect(dayBeforeSendAt(new Date('2026-11-01T15:00:00Z'), 'America/New_York').toISOString()).toBe('2026-10-31T14:00:00.000Z');
  });
});

describe('reminderDue (R-MSG-02, guardian tz)', () => {
  const startsAt = new Date('2026-10-04T14:00:00Z'); // Sun 17:00 Riyadh
  const due = (kind: 'day_before' | 'same_day', now: string, tz = 'Asia/Riyadh') =>
    reminderDue({ kind, startsAt, tz, minutesBefore: 60, now: new Date(now) });

  it.each([
    { name: 'same_day 61 min before', kind: 'same_day', now: '2026-10-04T12:59:00Z', expected: false },
    { name: 'same_day 60 min before', kind: 'same_day', now: '2026-10-04T13:00:00Z', expected: true },
    { name: 'same_day 1 min before', kind: 'same_day', now: '2026-10-04T13:59:00Z', expected: true },
    { name: 'same_day at the start', kind: 'same_day', now: '2026-10-04T14:00:00Z', expected: false },
    { name: 'day_before just before its time', kind: 'day_before', now: '2026-10-03T13:59:00Z', expected: false },
    { name: 'day_before at its time', kind: 'day_before', now: '2026-10-03T14:00:00Z', expected: true },
    { name: 'day_before late, still Saturday in Riyadh', kind: 'day_before', now: '2026-10-03T20:59:00Z', expected: true },
    { name: 'day_before after local midnight: the lesson is today', kind: 'day_before', now: '2026-10-03T21:00:00Z', expected: false },
  ] as const)('$name → $expected', ({ kind, now, expected }) => {
    expect(due(kind, now)).toBe(expected);
  });

  it('«بكرة» follows the guardian tz: New York is still Saturday morning', () => {
    // 2026-10-03T14:00Z = Sat 10:00 New York; the lesson is Sun 10:00 there.
    expect(due('day_before', '2026-10-03T14:00:00Z', 'America/New_York')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { followUpCycle, followUpKey, followUpKeyCycle, localDayStart } from './timing.js';

describe('follow-up keys (R-LEAD-05, rule 8)', () => {
  const lead = { last_inbound_at: '2026-10-01T10:00:00Z', created_at: '2026-09-30T08:00:00Z' };

  it('the cycle starts at the last message, else at creation', () => {
    expect(followUpCycle(lead)).toBe(Date.parse('2026-10-01T10:00:00Z'));
    expect(followUpCycle({ ...lead, last_inbound_at: null })).toBe(Date.parse('2026-09-30T08:00:00Z'));
  });

  it('a reply starts a new cycle, so stage 0 after a reply is a new key', () => {
    const first = followUpKey({ leadId: 'L1', cycle: followUpCycle(lead), stage: 0 });
    const later = followUpKey({ leadId: 'L1', cycle: followUpCycle({ ...lead, last_inbound_at: '2026-10-03T09:00:00Z' }), stage: 0 });
    expect(first).toBe(`follow_up_slots:L1:${Date.parse('2026-10-01T10:00:00Z')}:0`);
    expect(later).not.toBe(first);
  });

  it('reads the cycle back; anything else is null', () => {
    expect(followUpKeyCycle(followUpKey({ leadId: 'L1', cycle: 1727776800000, stage: 1 }))).toBe(1727776800000);
    expect(followUpKeyCycle('follow_up_slots:L1:0')).toBeNull();
    expect(followUpKeyCycle('lesson_reminder:a:b')).toBeNull();
    expect(followUpKeyCycle('follow_up_slots:L1:x:0')).toBeNull();
    expect(followUpKeyCycle(null)).toBeNull();
  });
});

describe('localDayStart (day-before reminder expiry)', () => {
  it('local midnight in the recipient tz, as UTC', () => {
    expect(localDayStart(new Date('2026-10-05T14:00:00Z'), 'Asia/Riyadh').toISOString()).toBe('2026-10-04T21:00:00.000Z');
    expect(localDayStart(new Date('2026-10-05T01:00:00Z'), 'Asia/Riyadh').toISOString()).toBe('2026-10-04T21:00:00.000Z');
    expect(localDayStart(new Date('2026-10-05T14:00:00Z'), 'Africa/Cairo').toISOString()).toBe('2026-10-04T21:00:00.000Z');
  });

  it('across a DST change (London, 25 Oct 2026)', () => {
    expect(localDayStart(new Date('2026-10-25T12:00:00Z'), 'Europe/London').toISOString()).toBe('2026-10-24T23:00:00.000Z');
    expect(localDayStart(new Date('2026-10-26T12:00:00Z'), 'Europe/London').toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });
});

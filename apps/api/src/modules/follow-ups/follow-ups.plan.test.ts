import { describe, expect, it } from 'vitest';
import { sampleLead } from './follow-ups.fakes';
import { followUpRow, followUpStep, leadZone, pickTwoSlots, sameInstant } from './follow-ups.plan';

const d = (iso: string) => new Date(iso);
const iso = (pair: [Date, Date] | null) => pair?.map((x) => x.toISOString()) ?? null;

describe('pickTwoSlots (R-LEAD-05: two real free slots)', () => {
  it('fewer than two distinct starts → null', () => {
    expect(pickTwoSlots([], 'Asia/Riyadh')).toBeNull();
    expect(pickTwoSlots([d('2026-10-04T14:00:00Z')], 'Asia/Riyadh')).toBeNull();
    expect(pickTwoSlots([d('2026-10-04T14:00:00Z'), d('2026-10-04T14:00:00Z')], 'Asia/Riyadh')).toBeNull();
  });

  it('the earliest, then the earliest on another local day (input order does not matter)', () => {
    const starts = [d('2026-10-05T15:00:00Z'), d('2026-10-04T14:45:00Z'), d('2026-10-04T14:00:00Z')];
    expect(iso(pickTwoSlots(starts, 'Asia/Riyadh'))).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-05T15:00:00.000Z']);
  });

  it('all on one day → the two earliest', () => {
    const starts = [d('2026-10-04T14:00:00Z'), d('2026-10-04T14:45:00Z'), d('2026-10-04T16:00:00Z')];
    expect(iso(pickTwoSlots(starts, 'Asia/Riyadh'))).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-04T14:45:00.000Z']);
  });

  it('«another day» is the lead’s local day', () => {
    // 20:30Z / 21:30Z: Sun 23:30 and Mon 00:30 in Riyadh, but both Sunday evening in London.
    const starts = [d('2026-10-04T20:30:00Z'), d('2026-10-04T21:30:00Z'), d('2026-10-05T15:00:00Z')];
    expect(iso(pickTwoSlots(starts, 'Asia/Riyadh'))).toEqual(['2026-10-04T20:30:00.000Z', '2026-10-04T21:30:00.000Z']);
    expect(iso(pickTwoSlots(starts, 'Europe/London'))).toEqual(['2026-10-04T20:30:00.000Z', '2026-10-05T15:00:00.000Z']);
  });
});

describe('leadZone', () => {
  it.each([
    { name: 'qualification.tz first', lead: { tz: 'Asia/Dubai', qualification: { tz: 'Africa/Cairo' } }, want: ['Africa/Cairo', 'القاهرة'] },
    { name: 'then leads.tz', lead: { tz: 'Asia/Dubai', qualification: {} }, want: ['Asia/Dubai', 'دبي'] },
    { name: 'a bad qualification is ignored', lead: { tz: 'Asia/Dubai', qualification: { tz: 'Not/AZone' } }, want: ['Asia/Dubai', 'دبي'] },
    { name: 'else Riyadh', lead: { tz: null, qualification: {} }, want: ['Asia/Riyadh', 'الرياض'] },
    { name: 'no Arabic city → Riyadh', lead: { tz: 'Europe/Paris', qualification: null }, want: ['Asia/Riyadh', 'الرياض'] },
  ])('$name', ({ lead, want: [tz, city] }) => {
    expect(leadZone(lead)).toEqual({ tz, city });
  });
});

describe('followUpRow', () => {
  it('follow_up_slots for the current stage: slots in the lead tz, city, stop payload, expires at slot 1', () => {
    const lead = sampleLead({ follow_up_stage: 1 });
    const slots: [Date, Date] = [d('2026-10-04T14:00:00Z'), d('2026-10-05T15:00:00Z')];
    const row = followUpRow({ lead, slots, zone: { tz: 'Asia/Riyadh', city: 'الرياض' }, now: d('2026-10-02T10:00:00Z') });
    expect(row).toEqual({
      direction: 'outbound',
      status: 'queued',
      phone_e164: '+966500000301',
      guardian_id: null,
      lead_id: 'lead-1',
      lesson_id: null,
      template_key: 'follow_up_slots',
      template_params: {
        '1': 'الأحد 4 أكتوبر 17:00',
        '2': 'الاثنين 5 أكتوبر 18:00',
        '3': 'الرياض',
        payloads: ['stop:lead-1'],
      },
      dedup_key: `follow_up_slots:lead-1:${Date.parse('2026-10-01T10:00:00Z')}:1`,
      scheduled_for: '2026-10-02T10:00:00.000Z',
      expires_at: '2026-10-04T14:00:00.000Z',
    });
  });
});

describe('sameInstant', () => {
  it('compares a stored timestamptz with a Date', () => {
    expect(sameInstant('2026-10-02T10:00:00+00:00', d('2026-10-02T10:00:00Z'))).toBe(true);
    expect(sameInstant('2026-10-02T10:00:00+00:00', d('2026-10-02T10:01:00Z'))).toBe(false);
    expect(sameInstant(null, null)).toBe(true);
    expect(sameInstant(null, d('2026-10-02T10:00:00Z'))).toBe(false);
    expect(sameInstant('2026-10-02T10:00:00Z', null)).toBe(false);
  });
});

describe('followUpStep (the stage moves on only when the follow-up left)', () => {
  const row = (status: 'queued' | 'sent' | 'delivered' | 'read' | 'sent_manually' | 'failed', error_code: string | null = null) => ({
    id: 'm1',
    status,
    error_code,
  });

  it.each([
    ['nothing queued yet', null, 'queue'],
    ['queued, gate closed or retrying', row('queued'), 'wait'],
    ['the admin is sending it by hand', row('failed', 'handed_off'), 'wait'],
    ['sent', row('sent'), 'advance'],
    ['read', row('read'), 'advance'],
    ['sent by hand', row('sent_manually'), 'advance'],
    ['failed for good: the admin was told', row('failed', '131026'), 'advance'],
    ['expired before it went out', row('failed', 'expired'), 'requeue'],
    ['dropped as stale', row('failed', 'stale'), 'requeue'],
    ['held while automatic messages were OFF', row('failed', 'auto_off'), 'requeue'],
  ] as const)('%s → %s', (_name, input, want) => {
    expect(followUpStep(input)).toBe(want);
  });
});

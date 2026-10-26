import { followUpKey, type LessonStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { dropReason, staleReason, type StaleInput, type StaleLead } from './send-stale';

const LAST = '2026-10-01T10:00:00Z';
const lead = (over: Partial<StaleLead> = {}): StaleLead => ({
  status: 'no_reply',
  follow_up_paused: false,
  last_inbound_at: LAST,
  created_at: '2026-09-30T08:00:00Z',
  ...over,
});
const booking = (status: LessonStatus): StaleInput => ({
  template_key: 'booking_confirmation',
  dedup_key: 'booking_confirmation:l1:g1',
  lesson_id: 'l1',
  lead_id: null,
  lesson: { status },
  lead: null,
});
const followUp = (l: StaleLead | null, cycle = Date.parse(LAST)): StaleInput => ({
  template_key: 'follow_up_slots',
  dedup_key: followUpKey({ leadId: 'lead-1', cycle, stage: 0 }),
  lesson_id: null,
  lead_id: 'lead-1',
  lesson: null,
  lead: l,
});

describe('staleReason (send-time check, docs/12 §3.3)', () => {
  it('a confirmation or reminder for an open lesson still goes', () => {
    expect(staleReason(booking('scheduled'))).toBeNull();
    expect(staleReason(booking('confirmed'))).toBeNull();
  });

  it.each(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled', 'completed', 'no_show'] as const)('lesson %s → stale', (status) => {
    expect(staleReason(booking(status))).toBe(`lesson ${status}`);
    expect(staleReason({ ...booking(status), template_key: 'lesson_reminder' })).toBe(`lesson ${status}`);
    expect(staleReason({ ...booking(status), template_key: 'lesson_join_link' })).toBe(`lesson ${status}`);
  });

  it('a report for a completed lesson, a renewal and an admin text are not lesson-timed', () => {
    expect(staleReason({ ...booking('completed'), template_key: 'report_ready' })).toBeNull();
    expect(staleReason({ ...booking('completed'), template_key: null })).toBeNull();
  });

  it('a follow-up to a lead still silent goes', () => {
    expect(staleReason(followUp(lead()))).toBeNull();
  });

  it.each([
    ['paused (by the admin or «وقف»)', lead({ follow_up_paused: true }), 'follow-ups paused'],
    ['moved on (trial booked)', lead({ status: 'trial_booked' }), 'lead trial_booked'],
    ['wrote again since', lead({ last_inbound_at: '2026-10-02T09:00:00Z' }), 'lead wrote again'],
    ['deleted', null, 'lead deleted'],
  ])('a follow-up to a lead who %s → stale', (_name, l, why) => {
    expect(staleReason(followUp(l))).toBe(why);
  });

  it('an old-format follow-up key (no cycle) is judged on the lead only', () => {
    expect(staleReason({ ...followUp(lead()), dedup_key: 'follow_up_slots:lead-1:0' })).toBeNull();
  });
});

describe('dropReason (before the claim)', () => {
  const NOW = new Date('2026-10-02T12:00:00Z');
  const row = (status: LessonStatus, expires_at: string | null) => ({
    ...booking(status),
    expires_at,
    lesson: { status, starts_at: '2026-10-03T12:00:00Z' },
  });

  it('past expires_at → expired, before the stale check', () => {
    expect(dropReason(row('cancelled_by_admin', '2026-10-02T11:00:00Z'), NOW)).toEqual({ code: 'expired', text: 'expired before it was sent' });
  });

  it('in its window: stale when the lesson moved, else kept', () => {
    expect(dropReason(row('rescheduled', null), NOW)).toEqual({ code: 'stale', text: 'lesson rescheduled' });
    expect(dropReason(row('scheduled', null), NOW)).toBeNull();
  });

  it('teacher_new_student whose lesson was retimed since it was queued → stale (never the old time)', () => {
    const alert = {
      ...row('scheduled', '2026-10-03T12:00:00Z'),
      template_key: 'teacher_new_student',
      dedup_key: 'teacher_new_student:l1:t1',
    };
    expect(dropReason(alert, NOW)).toBeNull();
    const moved = {
      ...alert,
      lesson: { status: 'scheduled' as const, starts_at: '2026-10-03T15:00:00Z' },
    };
    expect(dropReason(moved, NOW)).toEqual({ code: 'stale', text: 'lesson retimed' });
    // Only the alert: a reminder's expires_at is not its lesson's start.
    expect(dropReason({ ...moved, template_key: 'lesson_reminder' }, NOW)).toBeNull();
  });
});

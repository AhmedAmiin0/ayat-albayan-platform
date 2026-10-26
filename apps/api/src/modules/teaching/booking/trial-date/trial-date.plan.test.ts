import { describe, expect, it } from 'vitest';
import type { BookingPayload } from '../core/booking.mapper';
import { bookPick, movePick, type MovedTrial } from './trial-date.plan';

const PAYLOAD = {
  rule: { teacher_id: 't2' },
  student_ids: ['s1'],
  lessons: [{ starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:30:00.000Z', meeting_link: 'https://meet.jit.si/x', override_reason: null }],
  messages: [
    { guardian_id: 'g1', phone_e164: '+966500000001', template_key: 'booking_confirmation', template_params: { '1': 'سهيلة' } },
    { guardian_id: null, phone_e164: '+966500000002', template_key: 'booking_confirmation', template_params: {} },
  ],
  audit: { after: { kind: 'trial' } },
} as unknown as BookingPayload;
const OLD: MovedTrial = { id: 'old', rule_id: 'r1', status: 'confirmed', starts_at: '2026-10-03T10:00:00.000Z', teacher_id: 't1', student_ids: ['s1', 's2'] };

describe('the write of a new trial date', () => {
  it('no upcoming trial: the booking payload itself, audited as a new trial date', () => {
    const p = bookPick({ payload: PAYLOAD, actorId: 'a1' });
    expect(p).toMatchObject({ actor: 'a1', student_ids: ['s1'], teacher_id: 't2', booking: { audit: { after: { kind: 'trial', via: 'trial_new_date' } } } });
    expect(p.change).toBeUndefined();
  });

  it('a move: compare-and-set from the status read, the lesson keeps the plan’s link, the old row’s rule and students', () => {
    const p = movePick({ payload: PAYLOAD, actorId: 'a1', old: OLD, lessonId: 'new' });
    expect(p?.change?.changes).toEqual([{ id: 'old', from_status: 'confirmed', to_status: 'rescheduled', chargeable: false }]);
    expect(p?.change?.lessons).toEqual([
      { id: 'new', rule_id: 'r1', teacher_id: 't2', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:30:00.000Z', meeting_link: 'https://meet.jit.si/x', override_reason: null, rescheduled_from_id: 'old', student_ids: ['s1', 's2'] },
    ]);
    expect(p?.change?.audit).toEqual({
      entity: 'lessons',
      entity_id: 'old',
      action: 'trial_new_date',
      before: { status: 'confirmed', starts_at: '2026-10-03T10:00:00.000Z', teacher_id: 't1' },
      after: { lesson_id: 'new', starts_at: '2026-10-04T14:00:00.000Z', teacher_id: 't2', override_reason: null },
    });
    expect(p?.student_ids).toEqual(['s1', 's2']);
  });

  it('a move queues the confirmation of the new lesson per known guardian only', () => {
    const p = movePick({ payload: PAYLOAD, actorId: 'a1', old: OLD, lessonId: 'new' });
    expect(p?.change?.messages).toEqual([
      { guardian_id: 'g1', phone_e164: '+966500000001', template_key: 'booking_confirmation', template_params: { '1': 'سهيلة' }, lesson_id: 'new', dedup_key: 'booking_confirmation:new:g1' },
    ]);
  });

  it('a plan with no lesson moves nothing', () => {
    expect(movePick({ payload: { ...PAYLOAD, lessons: [] }, actorId: 'a1', old: OLD, lessonId: 'new' })).toBeNull();
  });
});

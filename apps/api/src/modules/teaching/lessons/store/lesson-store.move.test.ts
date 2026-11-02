import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import type { ChangeSet, QueuedMessage, TimeEditChange } from '@/modules/teaching/scheduling/change-set';
import { fakeStore } from '@/modules/teaching/lessons/lessons.fakes';

// ONE family WhatsApp per move (the owner's operator, 2026-10-30): before a move's write the store
// asks FamilyMoveNotice; lesson_rescheduled usable → its booking confirmation is not queued and the
// notice says the family hears lesson_rescheduled; otherwise the confirmation stays.

const NOW = new Date('2026-10-02T10:00:00Z');
const FROM = '2026-10-04T14:00:00.000Z';
const TO = '2026-10-05T14:00:00.000Z';
const confirmation: QueuedMessage = {
  phone_e164: '+966501234567', guardian_id: 'G1', lesson_id: 'L2',
  template_key: 'booking_confirmation', template_params: {}, dedup_key: 'booking_confirmation:L2:G1',
};
const moved: ScheduleChange = { kind: 'lesson_rescheduled', lessonId: 'L2', fromStartsAt: FROM, actorId: 'u1' };
const lesson = {
  id: 'L2', rule_id: null, teacher_id: 'T1', starts_at: TO, ends_at: TO, meeting_link: null,
  override_reason: null, rescheduled_from_id: 'L1', student_ids: ['S1'],
};
const change: ChangeSet = { actor: 'u1', lessons: [lesson], messages: [confirmation] };
const audit = { entity: 'lessons', entityId: 'L1', action: 'reschedule' };
const transition = { from: 'scheduled' as const, event: 'reschedule' as const };
const retime = {
  actor: 'u1', lesson_id: 'L2', from: { status: 'scheduled' as const, starts_at: FROM, ends_at: FROM },
  to: { starts_at: TO, ends_at: TO }, reason: null, override_reason: null, retime_open: true,
  refresh_pdf: false, messages: [confirmation], audit: { entity: 'lessons', entity_id: 'L2', action: 'time_edit' },
} satisfies TimeEditChange;

function setup(usable: boolean) {
  const s = fakeStore();
  s.family.open = usable;
  const heard = vi.fn(async (_c: ScheduleChange) => undefined);
  s.events.onScheduleChange(heard);
  const applied = () => s.writer.apply.mock.calls[0]?.[0].messages;
  const retimed = () => s.writer.retime.mock.calls[0]?.[0].messages;
  return { ...s, heard, applied, retimed };
}

describe('LessonStore: a move tells the family once', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('commit, lesson_rescheduled usable: no booking confirmation, the notice carries familyNotice', async () => {
    const s = setup(true);
    await s.store.commit({ change, audit, transition, notice: moved });
    expect(s.applied()).toEqual([]);
    expect(s.heard).toHaveBeenCalledWith({ ...moved, familyNotice: true });
  });

  it('commit, not usable (not approved / row off): the confirmation is queued, familyNotice false', async () => {
    const s = setup(false);
    await s.store.commit({ change, audit, transition, notice: moved });
    expect(s.applied()).toEqual([confirmation]);
    expect(s.heard).toHaveBeenCalledWith({ ...moved, familyNotice: false });
  });

  it('retime (a time edit), both template states', async () => {
    const on = setup(true);
    await on.store.retime(retime, moved);
    expect(on.retimed()).toEqual([]);
    expect(on.heard).toHaveBeenCalledWith({ ...moved, familyNotice: true });
    const off = setup(false);
    await off.store.retime(retime, moved);
    expect(off.retimed()).toEqual([confirmation]);
    expect(off.heard).toHaveBeenCalledWith({ ...moved, familyNotice: false });
  });

  it('not a move (a cancel, or no notice): the messages are left as they are', async () => {
    const s = setup(true);
    const cancel: ScheduleChange = { kind: 'lesson_cancelled', lessonId: 'L2', actorId: 'u1' };
    await s.store.commit({ change, audit, transition, notice: cancel });
    await s.store.retime(retime);
    expect(s.applied()).toEqual([confirmation]);
    expect(s.retimed()).toEqual([confirmation]);
    expect(s.heard).toHaveBeenCalledWith(cancel);
  });
});

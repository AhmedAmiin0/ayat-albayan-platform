import { describe, expect, it, vi } from 'vitest';
import { FamilyMoveNotice, familyMove } from './family-move';
import type { NoticeGate } from './notice.gate';
import { AT, FROM, NOW } from './schedule-notices.fakes';

// ONE family WhatsApp per move (the owner's operator, 2026-10-30): lesson_rescheduled when usable,
// otherwise the booking confirmation stays (template to template, never free text).

const confirmation = { template_key: 'booking_confirmation_meet', dedup_key: 'c' };
const other = { template_key: 'teacher_new_student', dedup_key: 'o' };
const move = { from: FROM.toISOString(), to: AT.toISOString() };

function setup(usable: boolean | Error) {
  const usableFn = vi.fn(async () => {
    if (usable instanceof Error) throw usable;
    return usable;
  });
  const gate = { usable: usableFn } as unknown as NoticeGate;
  return { usable: usableFn, family: new FamilyMoveNotice(gate) };
}

describe('familyMove (pure)', () => {
  it('usable: the family hears lesson_rescheduled, every booking_confirmation* row is dropped', () => {
    expect(familyMove(true, [confirmation, other])).toEqual({ familyNotice: true, messages: [other] });
  });

  it('not usable: the booking confirmation stays, nothing else changes', () => {
    expect(familyMove(false, [confirmation, other])).toEqual({
      familyNotice: false,
      messages: [confirmation, other],
    });
  });
});

describe('FamilyMoveNotice.choose', () => {
  it('template usable (row on, approved): lesson_rescheduled, no confirmation', async () => {
    const s = setup(true);
    const out = await s.family.choose(move, [confirmation], NOW);
    expect(out).toEqual({ familyNotice: true, messages: [] });
    expect(s.usable).toHaveBeenCalledWith('lesson_rescheduled');
  });

  it('template not usable (not approved or row off): the confirmation is the fallback', async () => {
    const s = setup(false);
    expect(await s.family.choose(move, [confirmation], NOW)).toEqual({
      familyNotice: false,
      messages: [confirmation],
    });
  });

  it('a move from a lesson already started: ScheduleNotices tells nobody, so the confirmation stays', async () => {
    const s = setup(true);
    const past = { from: '2026-10-31T08:00:00Z', to: AT.toISOString() };
    expect((await s.family.choose(past, [confirmation], NOW)).familyNotice).toBe(false);
    expect(s.usable).not.toHaveBeenCalled();
  });

  it('a failed gate read keeps the confirmation (never a family left without a message)', async () => {
    const s = setup(new Error('db down'));
    expect(await s.family.choose(move, [confirmation], NOW)).toEqual({
      familyNotice: false,
      messages: [confirmation],
    });
  });
});

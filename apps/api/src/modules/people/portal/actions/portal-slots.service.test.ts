import type { SlotView } from '@ab/schedule';
import { describe, expect, it, vi } from 'vitest';
import type { SlotsService } from '@/modules/teaching/booking';
import { lessonRow, S1, L1 } from '@/modules/people/portal/portal.fakes';
import type { PortalLessonActions } from './portal-actions.service';
import { freeStarts, PortalSlotsService } from './portal-slots.service';

const slot = (starts_at: string, busy = false): SlotView => ({
  starts_at,
  ends_at: starts_at,
  conflicts: busy ? [{ kind: 'teacher_busy', startsAt: starts_at } as never] : [],
});
const NOW = new Date('2026-10-26T10:00:00Z');
const USER = { id: 'g-a', email: null, role: 'guardian' as const };

describe('the family slots (owner 2026-11-17)', () => {
  it('free starts only, ahead, never the lesson’s own time; no clash detail leaves', () => {
    const slots = [
      slot('2026-10-26T09:00:00.000Z'),
      slot('2026-10-27T16:00:00.000Z'),
      slot('2026-10-28T16:00:00.000Z', true),
      slot('2026-10-29T16:00:00.000Z'),
    ];
    expect(freeStarts(slots, lessonRow(), NOW)).toEqual([{ starts_at: '2026-10-29T16:00:00.000Z', ends_at: '2026-10-29T16:00:00.000Z' }]);
  });

  it("asks the academy grid for the lesson's teacher, length and students, on the student's clock", async () => {
    const grid = { slots: vi.fn(async () => ({ teacher_tz: 'Asia/Riyadh', step_min: 30, slots: [] })) };
    const row = lessonRow({ teacher_id: 't-1' });
    const student = { id: S1, tz: 'Africa/Cairo' };
    const actions = { ahead: vi.fn(async () => ({ student, row })) };
    const svc = new PortalSlotsService(
      actions as unknown as PortalLessonActions,
      grid as unknown as SlotsService,
    );
    const q = { from: '2026-10-26T00:00:00Z', to: '2026-11-02T00:00:00Z' };
    expect(await svc.free({ user: USER, studentId: S1, lessonId: L1 }, q)).toEqual({ tz: 'Africa/Cairo', step_min: 30, slots: [] });
    const call = { teacherId: 't-1', ...q, durationMin: 30, studentIds: [S1], excludeLessonId: row.id };
    expect(grid.slots).toHaveBeenCalledWith(call);
  });

  it('a lesson length the grid does not book → 409 unsupported_duration', async () => {
    const row = lessonRow({ teacher_id: 't-1', ends_at: '2026-10-27T16:07:00.000Z' });
    const svc = new PortalSlotsService(
      { ahead: vi.fn(async () => ({ student: { tz: 'Africa/Cairo' }, row })) } as unknown as PortalLessonActions,
      { slots: vi.fn() } as unknown as SlotsService,
    );
    const q = { from: '2026-10-26T00:00:00Z', to: '2026-11-02T00:00:00Z' };
    await expect(svc.free({ user: USER, studentId: S1, lessonId: L1 }, q)).rejects.toMatchObject({ response: { code: 'unsupported_duration' } });
  });
});

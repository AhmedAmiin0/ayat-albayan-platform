import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { readerOf } from '@/common/settings/settings.fakes';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import type { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import type { ScheduleRepo } from '@/modules/teaching/scheduling/schedule.repo';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonCancelService, RescheduleOneService } from '@/modules/teaching/lessons';
import type { SalesStudentQueries } from '@/modules/sales/sales-students/details/sales-student.queries';
import type { SalesStudentScope } from '@/modules/sales/sales-students/sales-student-scope';
import { type LessonServices, SalesLessonActions } from './sales-lesson-actions.service';

// The owner's rule (docs/16 row 37): a salesperson's move / cancel has the admin's side effects exactly —
// the same change set (status changes, new row, confirmation messages queued to the family, audit), only
// her as the actor; nothing extra, nothing less. Real admin services over the same fake store.
const SALES: AuthUser = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' };
const NOW = new Date('2026-10-03T10:00:00Z'); // before the fixture lesson (2026-10-04 14:00Z)
const NEW_START = '2026-10-05T14:00:00.000Z';
const checker = { check: vi.fn() };

function rig() {
  const deps = fakeStore(lessonRow());
  const one = new RescheduleOneService(deps.store, { get: vi.fn() } as unknown as TeachersRepo, checker as unknown as ConflictChecker);
  const settings = readerOf(LessonsSettings, { booking_horizon_weeks: 5, late_cancel_hours: null });
  const cancels = new LessonCancelService(deps.store, { rule: vi.fn() } as unknown as ScheduleRepo, settings);
  const scope = { assertLesson: vi.fn(async () => undefined) } as unknown as SalesStudentScope;
  const queries = { lesson: vi.fn(async (id: string) => ({ id, starts_at: NEW_START, ends_at: NEW_START, status: 'scheduled', lesson_students: [] })) };
  const actions = new SalesLessonActions(scope, queries as unknown as SalesStudentQueries, { one, cancels } as LessonServices);
  return { ...deps, one, cancels, actions };
}

/** The change set with the generated new-lesson id and the actor replaced, so two paths compare. */
function normalised(writer: ReturnType<typeof fakeStore>['writer']) {
  const change = appliedChange(writer);
  const newId = change?.lessons?.[0]?.id ?? 'none';
  return JSON.parse(JSON.stringify({ ...change, actor: 'ACTOR' }).replaceAll(newId, 'NEW'));
}

describe('sales move / cancel = the admin path (docs/16 row 37)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    checker.check.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('reschedule: the same change set, confirmation messages and audit as the admin\'s scope-one move', async () => {
    const admin = rig();
    await admin.one.reschedule({ lessonId: LESSON_ID, body: { scope: 'one', startsAt: NEW_START }, actor: ADMIN });
    const sales = rig();
    await sales.actions.reschedule({ lessonId: LESSON_ID, body: { startsAt: NEW_START }, actor: SALES });
    expect(normalised(sales.writer)).toEqual(normalised(admin.writer));
    expect(normalised(sales.writer).messages).toHaveLength(1);
    expect(appliedChange(sales.writer)?.actor).toBe(SALES.id);
    expect(sales.record.mock.calls[0]?.[0]).toMatchObject({ actorId: SALES.id, action: 'reschedule' });
    expect(sales.record.mock.calls[0]?.[0].after).toEqual({ ...admin.record.mock.calls[0]?.[0].after, lesson_id: expect.any(String) });
  });

  it('cancel: the admin\'s «ألغتها الإدارة» change minus the reason; no message queued on either path', async () => {
    const admin = rig();
    await admin.cancels.cancel({ lessonId: LESSON_ID, body: { scope: 'one', by: 'admin', reason: 'ظرف' }, actor: ADMIN });
    const sales = rig();
    await sales.actions.cancel({ lessonId: LESSON_ID, body: {}, actor: SALES });
    const { cancel_reason: reason, ...adminChange } = appliedChange(admin.writer)?.changes[0] ?? {};
    expect(reason).toBe('ظرف');
    expect(appliedChange(sales.writer)?.changes).toEqual([adminChange]);
    expect(appliedChange(sales.writer)?.changes[0]).toMatchObject({ to_status: 'cancelled_by_admin', chargeable: false });
    for (const path of [admin, sales]) expect(appliedChange(path.writer)?.messages ?? []).toEqual([]);
    expect(sales.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: SALES.id, action: 'cancel', after: expect.objectContaining({ reason: null }) }));
  });

  it('touches only the one lesson: no rule end, no other lesson', async () => {
    const sales = rig();
    await sales.actions.cancel({ lessonId: LESSON_ID, body: {}, actor: SALES });
    const change = appliedChange(sales.writer);
    expect(change?.end_rule).toBeUndefined();
    expect(change?.changes.map((c) => c.id)).toEqual([LESSON_ID]);
  });
});

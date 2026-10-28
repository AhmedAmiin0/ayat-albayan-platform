import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { LessonStatusService } from '../../../teaching/lessons';
import { appliedChange, fakeStore, LESSON_ID, lessonRow } from '../../../teaching/lessons/lessons.fakes';
import { LessonsSettings } from '../../../teaching/lessons/lessons.settings';
import type { SalesStudentQueries } from '../details/sales-student.queries';
import type { SalesStudentScope } from '../sales-student-scope';
import { type LessonServices, SalesLessonActions } from './sales-lesson-actions.service';

// «تأكيد الحلقة» (owner 2026-10-28) through the teacher's real LessonStatusService over the fake store:
// any lesson, she is confirmed_by, no teacher-only check, no message, idempotent.
const SALES: AuthUser = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' };
const NOW = new Date('2026-10-03T10:00:00Z'); // before the fixture lesson (2026-10-04 14:00Z)
const access = { assertCanTouch: vi.fn(async () => Promise.reject(new Error('teacher-only rule'))) };

function rig(row: ReturnType<typeof lessonRow>) {
  const deps = fakeStore(row);
  const settings = readerOf(LessonsSettings, { booking_horizon_weeks: 5, late_cancel_hours: null });
  const status = new LessonStatusService(deps.store, access as unknown as ConstructorParameters<typeof LessonStatusService>[1], settings);
  const facts = { id: row.id, starts_at: row.starts_at, ends_at: row.ends_at, status: row.status, lesson_students: [] };
  const queries = { lesson: vi.fn(async () => facts) } as unknown as SalesStudentQueries;
  const actions = new SalesLessonActions({} as SalesStudentScope, queries, { status } as unknown as LessonServices);
  return { ...deps, actions };
}

describe('sales confirm = the teacher\'s confirm, any lesson', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('scheduled → confirmed, she is confirmed_by and the audit actor, no message queued', async () => {
    const r = rig(lessonRow());
    expect((await r.actions.confirm({ lessonId: LESSON_ID, actor: SALES })).status).toBe('confirmed');
    expect(appliedChange(r.writer)?.changes[0]).toMatchObject({ from_status: 'scheduled', to_status: 'confirmed', confirmed_by: SALES.id });
    expect(appliedChange(r.writer)?.messages ?? []).toEqual([]);
    expect(r.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: SALES.id, action: 'confirm' }));
    expect(access.assertCanTouch).not.toHaveBeenCalled();
  });

  it('already confirmed: unchanged, nothing written (idempotent)', async () => {
    const r = rig(lessonRow({ status: 'confirmed' }));
    expect((await r.actions.confirm({ lessonId: LESSON_ID, actor: SALES })).status).toBe('confirmed');
    expect(r.writer.apply).not.toHaveBeenCalled();
  });

  it('a cancelled lesson: 409 invalid_transition', async () => {
    const r = rig(lessonRow({ status: 'cancelled_by_admin' }));
    await expect(r.actions.confirm({ lessonId: LESSON_ID, actor: SALES })).rejects.toMatchObject({ response: { code: 'invalid_transition' } });
    expect(r.writer.apply).not.toHaveBeenCalled();
  });
});

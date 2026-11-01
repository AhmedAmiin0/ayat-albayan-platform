import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { errorCode } from '@/common/http/errors';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import type { SlotsQuery } from '@/modules/teaching/booking/booking.dto';
import type { SlotsService } from '@/modules/teaching/booking/plan/slots.service';
import type { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { SalesBookingScope } from './sales-booking.ownership';
import type { SalesQueries } from '@/modules/sales/sales/sales.queries';
import type { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import type { TrialDateRepo } from '@/modules/teaching/booking/trial-date/trial-date.repo';
import { SalesBookingOptions } from './sales-booking.service';

// Owner 2026-10-28 (docs/16 row 37): she may move ANY lesson, so the slot grid of «تغيير الموعد»
// (`lessonId`) reads that lesson's students whoever's they are; every other grid keeps her scope.
const MINE = 'c0000000-0000-4000-8000-000000000001';
const OTHER = 'c0000000-0000-4000-8000-000000000002';
const LESSON = 'd0000000-0000-4000-8000-000000000001';
const OWN: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [MINE], phones: [] };
const user = (permissions: Permission[]): AuthUser => ({ id: 'b1', email: null, role: 'sales', permissions });
const MOVER = user(['self.sales', 'lessons.reschedule']);
const query = (over: Partial<SlotsQuery> = {}): SlotsQuery => ({
  teacherId: 't1', from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z', durationMin: 45, studentIds: [OTHER], ...over,
});

function rig(lessonStudents: string[]) {
  const scope = {
    of: vi.fn(async () => OWN),
    owned: vi.fn(async () => OWN),
    ownLesson: vi.fn(async () => false),
    isLessonOf: vi.fn(async (_id: string, ids: readonly string[]) => ids.length === lessonStudents.length && ids.every((i) => lessonStudents.includes(i))),
  };
  const slots = { slots: vi.fn(async () => ({ slots: [] })) };
  const options = new SalesBookingOptions(scope as unknown as SalesBookingScope, {} as TeacherOptionsService, slots as unknown as SlotsService);
  return { options, slots, scope };
}
const failed = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => errorCode(e));

describe('GET /sales/booking/slots for «تغيير الموعد» of any lesson', () => {
  it('the grid of another family\'s lesson (exactly its students) reads with the key', async () => {
    const r = rig([OTHER]);
    await r.options.slots(query({ lessonId: LESSON }), MOVER);
    expect(r.slots.slots).toHaveBeenCalledTimes(1);
    expect(r.scope.isLessonOf).toHaveBeenCalledWith(LESSON, [OTHER]);
  });

  it('a mixed group lesson reads too; a student added to the grid that is not in the lesson does not', async () => {
    const r = rig([MINE, OTHER]);
    await r.options.slots(query({ lessonId: LESSON, studentIds: [MINE, OTHER] }), MOVER);
    expect(r.slots.slots).toHaveBeenCalledTimes(1);
    expect(await failed(rig([OTHER]).options.slots(query({ lessonId: LESSON, studentIds: [OTHER, 'c0000000-0000-4000-8000-000000000009'] }), MOVER))).toBe('not_your_student');
  });

  it('without lessons.reschedule or without a lessonId her scope holds: 403 not_your_student, nothing read', async () => {
    const r = rig([OTHER]);
    expect(await failed(r.options.slots(query({ lessonId: LESSON }), user(['self.sales'])))).toBe('not_your_student');
    expect(await failed(r.options.slots(query(), MOVER))).toBe('not_your_student');
    expect(r.scope.isLessonOf).not.toHaveBeenCalled();
    expect(r.slots.slots).not.toHaveBeenCalled();
  });

  it('a course grid (excludeCourse) stays hers whatever the lesson says', async () => {
    const r = rig([OTHER]);
    expect(await failed(r.options.slots(query({ lessonId: LESSON, excludeCourse: LESSON }), MOVER))).toBe('not_your_student');
    expect(r.slots.slots).not.toHaveBeenCalled();
  });
});

describe('SalesBookingScope.isLessonOf', () => {
  const scopeOver = (students: string[]) =>
    new SalesBookingScope({} as SalesQueries, {} as BookingSettings, { lessonStudents: vi.fn(async () => students) } as unknown as TrialDateRepo);
  it('true only for exactly the lesson\'s students (any order); never for a lesson with none', async () => {
    expect(await scopeOver([MINE, OTHER]).isLessonOf(LESSON, [OTHER, MINE])).toBe(true);
    expect(await scopeOver([MINE, OTHER]).isLessonOf(LESSON, [OTHER])).toBe(false);
    expect(await scopeOver([OTHER]).isLessonOf(LESSON, [OTHER, MINE])).toBe(false);
    expect(await scopeOver([]).isLessonOf(LESSON, [])).toBe(false);
  });
});

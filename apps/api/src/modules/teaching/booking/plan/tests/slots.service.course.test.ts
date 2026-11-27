import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { SlotsQuery } from '@ab/schedule';
import { fakeContext, IDS } from '@/modules/teaching/booking/booking.fakes';
import type { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { SlotsService } from '@/modules/teaching/booking/plan/slots.service';

// The course's own lessons move, so the grid shows their time free.
const SUB = '00000000-0000-4000-8000-000000000001';
const query = (over: Partial<SlotsQuery> = {}): SlotsQuery => ({
  teacherId: IDS.teacher,
  from: '2026-10-04T00:00:00Z',
  to: '2026-10-05T00:00:00Z',
  durationMin: 45,
  stepMin: 60,
  studentIds: [IDS.s1],
  ...over,
});

describe('SlotsService — excludeCourse', () => {
  it('the course’s lessons are not busy, teacher or student side; other lessons still are', async () => {
    const deps = fakeContext();
    const service = new SlotsService(deps.queries as unknown as BookingRepo, deps.context, readerOf(BookingSettings, { teachers_always_available: false }));
    const at = (h: number) => ({ starts_at: new Date(`2026-10-04T${h}:00:00Z`), ends_at: new Date(`2026-10-04T${h}:45:00Z`) });
    deps.availability.listBusyLessons.mockResolvedValue([{ id: 'e9999999-9999-4999-8999-999999999995', ...at(14) }]);
    deps.busy.studentLessons.mockResolvedValue([
      { id: 'e9999999-9999-4999-8999-999999999995', student_id: IDS.s1, ...at(14) },
      { id: 'e9999999-9999-4999-8999-999999999994', student_id: IDS.s1, ...at(16) },
    ]);
    deps.busy.courseLessonIds.mockResolvedValue(['e9999999-9999-4999-8999-999999999995']);
    const blocked = async (over: Partial<SlotsQuery>) =>
      (await service.slots(query(over))).slots.filter((s) => s.conflicts.length > 0).map((s) => s.starts_at.slice(11, 16));
    expect(await blocked({})).toEqual(['14:00', '16:00']);
    expect(deps.busy.courseLessonIds).not.toHaveBeenCalled();
    expect(await blocked({ excludeCourse: SUB })).toEqual(['16:00']);
    expect(deps.busy.courseLessonIds).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: SUB, studentIds: [IDS.s1] }));
  });
});

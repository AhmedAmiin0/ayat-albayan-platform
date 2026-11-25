import { NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { profileApp, S1, SUB_ID } from '@/modules/teaching/booking/profile/profile-course.fakes';

// For the admin (students.read) and every assistant (self.sales_academy), any student.
type App = Awaited<ReturnType<typeof profileApp>>;
const COURSE = {
  subscriptionId: SUB_ID,
  teacherId: 't1',
  days: [{ weekday: 1, startTimeLocal: '17:00' }],
  tz: 'Asia/Riyadh',
  endsOn: '2026-11-23',
  lessonsTotal: 8,
};
const lesson = (i: number, status = 'completed') => ({
  ...{ id: `l${i}`, starts_at: `2026-11-0${i}T14:00:00Z`, rule_id: 'ra', local_date: null },
  ...{ status, chargeable: true, makeup: false, instant: false },
});

describe('GET /students/:id/course-card', () => {
  let t: App;
  beforeAll(async () => {
    t = await profileApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    t.m.views.booked.mockResolvedValue({ student: {}, course: COURSE });
    t.m.repo.teacher.mockResolvedValue({ id: 't1', status: 'active', display_name_ar: 'فاطمة' });
    t.m.lessons.ofCourse.mockResolvedValue([lesson(1), lesson(2), lesson(3, 'cancelled_by_admin')]);
    t.m.repo.upcoming.mockResolvedValue([{ id: 'u1', status: 'confirmed', starts_at: '2026-11-18T14:00:00Z' }]);
  });

  it('the summary: teacher, days, end, last booked lesson, 6 without a date, the next lessons', async () => {
    const res = await t.get('admin', `/students/${S1}/course-card`);
    expect(res.json()).toEqual({
      subscriptionId: SUB_ID,
      package: null,
      course: {
        ...{ teacherName: 'فاطمة', days: COURSE.days, tz: 'Asia/Riyadh', endsOn: '2026-11-23' },
        ...{ lastAt: '2026-11-02T14:00:00Z', lessonsTotal: 8, unbooked: 6 },
      },
      upcoming: [{ id: 'u1', startsAt: '2026-11-18T14:00:00Z', status: 'confirmed' }],
    });
    expect(t.m.repo.upcoming).toHaveBeenCalledWith(['ra', 'rb'], 8);
  });

  it('the package: left, used, what was paid of what it is owed for', async () => {
    const balance = { lessons_used: 9, remaining: 3, projected_end_at: '2026-11-24T15:30:00Z' };
    const sub = { id: SUB_ID, status: 'active', lessons_total: 12, paid: 300, price: 360 };
    const packages = [{ ...sub, currency: 'SAR', balance }];
    t.m.packages.studentBalance.mockResolvedValue({ remaining: 3, current: null, packages });
    expect((await t.get('admin', `/students/${S1}/course-card`)).json().package).toEqual({
      ...{ status: 'active', lessonsTotal: 12, used: 9, left: 3, paid: 300, owed: 360 },
      ...{ currency: 'SAR', projectedEndAt: '2026-11-24T15:30:00Z' },
    });
  });

  it('the assistant reads the same card; a teacher 403', async () => {
    expect((await t.get('sales', `/sales/students/${S1}/course-card`)).statusCode).toBe(200);
    expect((await t.get('sales', `/students/${S1}/course-card`)).statusCode).toBe(403);
    expect((await t.get('teacher', `/sales/students/${S1}/course-card`)).statusCode).toBe(403);
  });

  it('no package: the empty card; a package not booked yet: no course', async () => {
    t.m.repo.currentSubscription.mockRejectedValue(new NotFoundException());
    expect((await t.get('admin', `/students/${S1}/course-card`)).json()).toEqual({
      subscriptionId: null,
      package: null,
      course: null,
      upcoming: [],
    });
    t.m.repo.currentSubscription.mockResolvedValue(SUB_ID);
    t.m.views.booked.mockResolvedValue({ student: {}, course: null });
    expect((await t.get('admin', `/students/${S1}/course-card`)).json().course).toBeNull();
  });
});

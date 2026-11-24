import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRE_ON } from '@/modules/sales/sales/rule/sales-ownership-rule.fakes';
import { profileApp, S1, SALES, SUB_ID } from './profile-course.fakes';

// While the ownership rule enforces it, an assistant reads only her own students' course routes;
// the reset ownership owns no student, so S1 is another assistant's student.
type App = Awaited<ReturnType<typeof profileApp>>;
const TEACHERS = `/students/${S1}/course-teacher/teachers`;
const CHANGE = `/students/${S1}/course-teacher/change?subscriptionId=${SUB_ID}`;
const EXTEND = `/students/${S1}/course-extend`;
const MINE = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };

describe('profile course reads by an assistant while the ownership rule enforces it', () => {
  let t: App;
  beforeAll(async () => {
    t = await profileApp(REQUIRE_ON);
  }, 60_000);
  afterAll(() => t.app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] });
    t.reset();
    t.m.options.list.mockResolvedValue([]);
  });

  it("another assistant's student's teacher choices are 403; nothing is listed", async () => {
    const res = await t.get('sales', TEACHERS);
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(t.m.options.list).not.toHaveBeenCalled();
    expect(t.m.sales.ownership).toHaveBeenCalledWith(SALES);
  });

  it("another assistant's student's teacher change view is 403; the course is not read", async () => {
    const res = await t.get('sales', CHANGE);
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(t.m.views.view).not.toHaveBeenCalled();
    expect(t.m.queries.course).not.toHaveBeenCalled();
  });

  it("another assistant's student's extend preview is 403; no rule or lesson is read", async () => {
    const res = await t.get('sales', EXTEND);
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(t.m.queries.rules).not.toHaveBeenCalled();
    expect(t.m.lessons.ofCourse).not.toHaveBeenCalled();
    expect(t.m.extendRepo.extendRules).not.toHaveBeenCalled();
  });

  it("her own student's teacher choices are listed", async () => {
    t.m.sales.ownership.mockResolvedValue(MINE);
    expect((await t.get('sales', TEACHERS)).statusCode).toBe(200);
    expect(t.m.options.list).toHaveBeenCalledWith({ studentId: S1 });
  });

  it("the admin lists any student's teacher choices, the rule never asked", async () => {
    expect((await t.get('admin', TEACHERS)).statusCode).toBe(200);
    expect(t.m.options.list).toHaveBeenCalledWith({ studentId: S1 });
    expect(t.m.sales.ownership).not.toHaveBeenCalled();
  });
});

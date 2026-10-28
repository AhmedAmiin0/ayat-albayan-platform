import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, OTHER, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const DAY = 86_400_000;

describe('GET /sales/students/:id «الجدول» (owner 2026-10-27)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('her own student: the weekly slots and the next lessons, read for the next 14 days, at most 20', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' });
    expect(res.statusCode).toBe(200);
    const { schedule } = res.json();
    expect(schedule.weekly).toEqual([expect.objectContaining({ rule_id: 'r1', byday: [0, 2, 4], start_time_local: '19:00', tz: 'Asia/Riyadh', duration_min: 45, teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' } })]);
    // An imported rule is in Riyadh; «عند الطالب» reads the student's own zone.
    expect(schedule.student_tz).toBe('Africa/Cairo');
    expect(schedule.weekly[0].next).toHaveLength(3);
    expect(schedule.upcoming).toEqual([{
      id: 'u1', starts_at: '2099-01-04T16:00:00+00:00', ends_at: '2099-01-04T16:45:00+00:00', status: 'scheduled', trial: true, makeup: false,
      teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo' },
      students: [{ id: MINE, code: 'AB-0101', name: 'ياسمين', tz: 'Africa/Cairo', mine: true }],
    }]);
    expect(t.schedule.rules).toHaveBeenCalledWith(MINE);
    const [id, w] = t.schedule.upcoming.mock.calls[0] ?? [];
    expect(id).toBe(MINE);
    expect([w.to.getTime() - w.from.getTime(), w.limit]).toEqual([14 * DAY, 20]);
  });

  it('never a meeting link, a classroom mode or money in «الجدول»', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' });
    expect(JSON.stringify(res.json().schedule)).not.toMatch(/meet|link|classroom|price|amount/i);
  });

  it('an unknown student: 404, the schedule never read (another salesperson\'s student shows it, owner 2026-10-28)', async () => {
    t.queries.student.mockResolvedValue(null);
    expect((await t.call('GET', `/sales/students/${OTHER}`, { token: 'salesA' })).statusCode).toBe(404);
    expect(t.schedule.rules).not.toHaveBeenCalled();
    expect(t.schedule.upcoming).not.toHaveBeenCalled();
  });
});

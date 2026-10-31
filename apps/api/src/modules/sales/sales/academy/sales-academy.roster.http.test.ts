import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { academyApp, studentRow } from './sales-academy.fakes';
import type { RosterLessonRow, RosterPackageRow, RosterRuleRow } from './sales-roster.repo';

type App = Awaited<ReturnType<typeof academyApp>>;

// Tuesday 27 October 2026, 13:00 in Riyadh.
const NOW = new Date('2026-10-27T10:00:00Z');
const SECRET = /price|currency|amount|payment|receipt|commission|meeting|link|note|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

/** As the database could return them, with secret columns present: none may leave. */
const rule = (): RosterRuleRow =>
  ({
    student_id: 's1',
    rule: {
      id: 'r1', byday: [0, 2, 4], start_time_local: '11:00:00', tz: 'Asia/Riyadh', duration_min: 45, package: '12',
      starts_on: '2026-10-01', ends_on: null, status: 'active', meeting_link: 'https://meet/secret', subscription_id: 'sub',
      teacher: { display_name_ar: 'أسماء حسين', display_name_en: 'Asma Hussein' },
    },
  }) as RosterRuleRow;
const pkg = (): RosterPackageRow =>
  ({
    id: 'sub', student_id: 's1', package: '12', status: 'active', starts_on: '2026-10-01', renews_on: null,
    lessons_total: 12, created_at: '2026-09-30T10:00:00Z', price: 290, currency: 'SAR',
  }) as RosterPackageRow;
type Status = RosterLessonRow['lesson']['status'];
const lesson = (starts_at: string, status: Status, attendance: RosterLessonRow['attendance'] = null): RosterLessonRow =>
  ({ student_id: 's1', attendance, lesson: { starts_at, status } });

describe('GET /sales/students/all: every student with schedule and attendance (owner 2026-10-30)', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    t.academy.students.mockResolvedValue({ rows: [studentRow(), { ...studentRow(), id: 's2', name: 'سارة' }], total: 2 });
    t.roster.rules.mockResolvedValue([rule()]);
    t.roster.packages.mockResolvedValue([pkg()]);
    t.roster.balances.mockResolvedValue([
      { subscription_id: 'sub', lessons_used: 3, remaining: 9, ended_at: null, projected_end_at: null },
    ]);
    t.roster.lessons.mockResolvedValue([
      lesson('2026-10-04T08:00:00Z', 'completed'),
      lesson('2026-10-06T08:00:00Z', 'scheduled', 'absent'),
      lesson('2026-10-08T08:00:00Z', 'cancelled_by_teacher'),
      lesson('2026-09-20T08:00:00Z', 'completed'),
    ]);
  });
  afterEach(() => vi.useRealTimers());

  it('another assistant\'s student (salesB): the weekly slots and the attendance of the current package', async () => {
    const res = await t.get('/sales/students/all', 'salesB');
    const [s1, s2] = res.json().items;
    expect(s1).not.toHaveProperty('mine');
    expect(s1.weekly).toEqual([
      {
        next: ['2026-10-29T08:00:00.000Z', '2026-11-01T08:00:00.000Z', '2026-11-03T08:00:00.000Z'],
        teacher: { display_name_ar: 'أسماء حسين', display_name_en: 'Asma Hussein' },
      },
    ]);
    // Since the package started (1 Oct): the September lesson and the cancelled one do not count.
    expect(s1.attendance).toEqual({ attended: 1, held: 2, basis: 'subscription' });
    expect(s2).toMatchObject({ weekly: [], attendance: { attended: 0, held: 0, basis: 'recent' } });
    expect(s1.status).toBe('active');
    expect(s1.package).toMatchObject({ package: '12', status: 'active', lessons_used: 3, lessons_remaining: 9 });
    expect(s2.package).toBeNull();
  });

  it('one read per kind for the whole page (no request per row), from the earliest start', async () => {
    await t.get('/sales/students/all', 'salesA');
    expect(t.roster.rules).toHaveBeenCalledTimes(1);
    expect(t.roster.rules).toHaveBeenCalledWith(['s1', 's2']);
    expect(t.roster.packages).toHaveBeenCalledWith(['s1', 's2']);
    expect(t.roster.lessons).toHaveBeenCalledTimes(1);
    expect(t.roster.balances).toHaveBeenCalledWith(['sub']);
    expect(t.roster.lessons).toHaveBeenCalledWith(['s1', 's2'], { from: new Date('2026-09-27T10:00:00.000Z'), to: NOW });
  });

  it('never a price, payment, commission or link from the rows read (rule link, package price)', async () => {
    const res = await t.get('/sales/students/all', 'salesB');
    expect(keys(res.json()).filter((k) => SECRET.test(k))).toEqual([]);
    expect(res.body).not.toMatch(/meet\/secret|290|SAR|subscription_id/);
  });
});

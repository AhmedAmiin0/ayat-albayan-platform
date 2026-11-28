import { describe, expect, it } from 'vitest';
import { salesAcademyStudentRoutes as routes } from '../academy-students.routes';

const PACKAGE = {
  id: 'p1',
  package: '8',
  status: 'active',
  starts_on: '2026-09-01',
  renews_on: null,
  ended_at: null,
  projected_end_at: '2026-10-20T15:00:00.000Z',
  created_at: '2026-09-01T10:00:00Z',
  lessons_total: 8,
  lessons_used: 3,
  lessons_remaining: 5,
};
const ROW = {
  id: 's1',
  code: 'AB-0101',
  name: 'ياسمين',
  status: 'active',
  program: 'quran',
  teacher_name: 'أبرار',
  guardian_name: 'أم ياسمين',
  guardian_phone: '+966500000001',
  mine: true,
  weekly: [
    {
      next: ['2026-09-06T15:00:00.000Z'],
      teacher: { display_name_ar: 'أبرار', display_name_en: null },
    },
  ],
  attendance: { attended: 3, held: 4, basis: 'subscription' },
  package: PACKAGE,
};
const PAGE = { items: [ROW], total: 1, page: 1, pageSize: 25 };

describe('salesAcademyStudentRoutes', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([['GET', '/sales/students/all', ['self.sales_academy'], ['sales']]]);
  });

  it('reads the page, the size and a trimmed search', () => {
    const query = routes.students.query.parse({ page: '2', pageSize: '10', search: ' AB ' });
    expect(query).toEqual({ page: 2, pageSize: 10, search: 'AB' });
    expect(routes.students.query.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
  });

  it('answers a page of rows with their package, slots and attendance', () => {
    expect(routes.students.response.parse(PAGE)).toEqual(PAGE);
  });

  it('accepts a row of another salesperson with no package, slot or phone', () => {
    const { mine, weekly, attendance, ...bare } = ROW;
    const row = { ...bare, teacher_name: null, guardian_phone: null, package: null };
    expect(routes.students.response.safeParse({ ...PAGE, items: [row] }).success).toBe(true);
    expect([mine, weekly.length, attendance.basis]).toEqual([true, 1, 'subscription']);
  });

  it('never sends a price the package row carries', () => {
    const priced = { ...ROW, package: { ...PACKAGE, price: 290 } };
    const items = routes.students.response.parse({ ...PAGE, items: [priced] }).items;
    expect(items[0]?.package).not.toHaveProperty('price');
  });

  it('keeps an overdrawn package, whose lessons left fall below zero', () => {
    const over = { ...ROW, package: { ...PACKAGE, lessons_used: 9, lessons_remaining: -1 } };
    expect(routes.students.response.safeParse({ ...PAGE, items: [over] }).success).toBe(true);
  });

  it('refuses an unknown status, program, package size, basis or a negative count', () => {
    const bad = [
      { ...ROW, status: 'lost' },
      { ...ROW, program: 'chess' },
      { ...ROW, package: { ...PACKAGE, package: '9' } },
      { ...ROW, package: { ...PACKAGE, status: 'lost' } },
      { ...ROW, attendance: { attended: 1, held: 1, basis: 'year' } },
      { ...ROW, attendance: { attended: -1, held: 1, basis: 'recent' } },
    ];
    for (const row of bad) {
      expect(routes.students.response.safeParse({ ...PAGE, items: [row] }).success).toBe(false);
    }
  });
});

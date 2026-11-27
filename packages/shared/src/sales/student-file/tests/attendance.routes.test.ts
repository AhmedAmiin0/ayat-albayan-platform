import { describe, expect, it } from 'vitest';
import { studentAttendanceRoutes } from '../attendance.routes';
import { ATTENDANCE_TOTAL_KINDS } from '../attendance.schemas';
import { salesStudentFileRoutes } from '../student-file.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const sales = salesStudentFileRoutes.attendance;
const admin = studentAttendanceRoutes.table;
const totals = Object.fromEntries(ATTENDANCE_TOTAL_KINDS.map((kind) => [kind, 0]));
const TABLE = { month: '2026-11', months: ['2026-11'], items: [], totals, mine: true };

describe('student attendance routes', () => {
  it('keeps the paths, the permissions and the tags the api serves today', () => {
    const wire = [sales, admin].map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/sales/students/:id/attendance', ['self.sales_academy'], ['sales']],
      ['GET', '/students/:id/attendance', ['students.read'], ['students']],
    ]);
  });

  it('takes a uuid and an optional month, left to the service to judge', () => {
    for (const route of [sales, admin]) {
      expect(route.params.parse({ id: ID })).toEqual({ id: ID });
      expect(route.params.safeParse({ id: 'nope' }).success).toBe(false);
      expect(route.query.parse({})).toEqual({});
      expect(route.query.parse({ month: '2026-13' })).toEqual({ month: '2026-13' });
    }
  });

  it('answers the month table and refuses one without its months', () => {
    expect(admin.response.parse(TABLE)).toEqual(TABLE);
    expect(sales.response.safeParse({ ...TABLE, months: undefined }).success).toBe(false);
  });
});

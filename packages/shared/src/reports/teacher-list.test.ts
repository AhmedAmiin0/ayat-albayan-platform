import { describe, expect, it } from 'vitest';
import { teacherReportsQuerySchema } from './teacher-list.js';

describe('teacherReportsQuerySchema (R-NFR-08)', () => {
  it('allowlisted sort, attendance and grade enums, a trimmed student search', () => {
    const q = { sort: 'grade', dir: 'desc', attendance: 'late', grade: 'excellent', student: ' AB-0183 ' };
    expect(teacherReportsQuerySchema.parse(q)).toEqual({ ...q, student: 'AB-0183' });
    expect(teacherReportsQuerySchema.parse({})).toEqual({});
  });

  it.each([{ sort: 'starts_at' }, { attendance: 'maybe' }, { grade: 'A+' }, { student: ' ' }])('refuses %o', (bad) => {
    expect(teacherReportsQuerySchema.safeParse(bad).success).toBe(false);
  });
});

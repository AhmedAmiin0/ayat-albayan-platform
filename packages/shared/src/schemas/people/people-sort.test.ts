import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  applicantColumnQueryShape,
  leadColumnQueryShape,
  studentColumnQueryShape,
  teacherColumnQueryShape,
} from './people-sort.js';

const students = z.object(studentColumnQueryShape);
const teachers = z.object(teacherColumnQueryShape);
const applicants = z.object(applicantColumnQueryShape);
const leads = z.object(leadColumnQueryShape);

describe('people list sort + column filters (R-NFR-08)', () => {
  it('students: allowlisted sort, trimmed text filters, blanks dropped', () => {
    expect(students.parse({ sort: 'guardian', dir: 'desc', code: ' AB-01 ', name: '', guardian: 'ام' })).toEqual({
      sort: 'guardian',
      dir: 'desc',
      code: 'AB-01',
      guardian: 'ام',
    });
    expect(students.safeParse({ sort: 'guardian_id' }).success).toBe(false);
    expect(students.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
  });

  it('teachers: program and status selects are enums', () => {
    expect(teachers.parse({ programs: 'quran', status: 'active', sort: 'max_students' })).toEqual({
      programs: 'quran',
      status: 'active',
      sort: 'max_students',
    });
    expect(teachers.parse({ programs: '', status: '' })).toEqual({});
    expect(teachers.safeParse({ status: 'gone' }).success).toBe(false);
  });

  it('applicants: link columns filter by presence', () => {
    expect(applicants.parse({ cv: 'yes', recitation: 'no', sort: 'created_at' })).toEqual({ cv: 'yes', recitation: 'no', sort: 'created_at' });
    expect(applicants.safeParse({ cv: 'maybe' }).success).toBe(false);
  });

  it('leads: assignee is none or a uuid', () => {
    expect(leads.parse({ assignee: 'none', sort: 'name' })).toEqual({ assignee: 'none', sort: 'name' });
    expect(leads.safeParse({ assignee: 'bob' }).success).toBe(false);
  });
});

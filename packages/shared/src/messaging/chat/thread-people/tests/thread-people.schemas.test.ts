import { describe, expect, it } from 'vitest';
import { threadPeopleSchema, threadStudentViewSchema } from '../thread-people.schemas';

const SUB = {
  id: 'c0000000-0000-4000-8000-000000000002',
  status: 'active',
  package_size: null,
  lessons_total: 8,
  lessons_used: 9,
  lessons_remaining: -1,
  price: 400,
  currency: 'SAR',
  paid_amount: 400,
  due_amount: 0,
  renews_on: null,
  starts_on: '2026-10-01',
};
const STUDENT = {
  id: 'c0000000-0000-4000-8000-000000000003',
  name: 'ياسمين',
  code: 'AB-0012',
  teacher_name: null,
  status: 'active',
  subscription: SUB,
};
const GUARDIAN = { id: 'c0000000-0000-4000-8000-000000000004', name: 'أم ياسمين' };

describe('threadPeopleSchema', () => {
  it('reads a guardian with a student past every package', () => {
    const people = { guardian: GUARDIAN, lead: null, students: [STUDENT] };
    expect(threadPeopleSchema.parse(people)).toEqual(people);
  });

  it('reads an unknown number: nobody and no students', () => {
    const people = { guardian: null, lead: null, students: [] };
    expect(threadPeopleSchema.parse(people)).toEqual(people);
  });

  it('refuses an unknown stage, package status or a start that is not a date', () => {
    const bad = [
      { guardian: null, lead: { id: GUARDIAN.id, status: 'gone' }, students: [] },
      {
        guardian: GUARDIAN,
        lead: null,
        students: [{ ...STUDENT, subscription: { ...SUB, status: 'x' } }],
      },
      {
        guardian: GUARDIAN,
        lead: null,
        students: [{ ...STUDENT, subscription: { ...SUB, starts_on: 'soon' } }],
      },
    ];
    expect(bad.map((p) => threadPeopleSchema.safeParse(p).success)).toEqual([false, false, false]);
  });

  it('reads a student without a package yet', () => {
    const student = { ...STUDENT, subscription: null };
    expect(threadStudentViewSchema.parse(student)).toEqual(student);
  });
});

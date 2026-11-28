import type { RouteSpec } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { guardianRoutes } from '../guardians/guardians.routes';
import { peopleEditRoutes } from '../schemas/people-edit.routes';
import { teacherStudentRoutes } from '../schemas/teacher-students.routes';
import { studentRoutes } from '../students/roster/students.routes';
import { availabilityRoutes } from '../teachers/availability.routes';
import { teacherRoutes } from '../teachers/teachers.routes';
import { testAccountRoutes } from '../test-accounts/test-accounts.routes';

const tables = [
  guardianRoutes,
  peopleEditRoutes,
  teacherStudentRoutes,
  studentRoutes,
  availabilityRoutes,
  teacherRoutes,
  testAccountRoutes,
];

const accessLine = ({ method, path, permissions, tags }: RouteSpec) =>
  `${method} ${path} ${permissions?.join('|') ?? '-'} ${tags?.join(',') ?? '-'}`;

describe('people route objects carry the access the api checks today', () => {
  it('names one permission and the swagger tag on every route', () => {
    const lines = tables.flatMap((table) => Object.values(table).map(accessLine));
    expect(lines.toSorted()).toEqual([
      'DELETE /guardians/:id guardians.write guardians',
      'DELETE /guardians/:id/phones/:phone guardians.write guardians',
      'DELETE /people/guardians/:id/phones/:phone people.edit people',
      'DELETE /students/:id students.write students',
      'DELETE /teachers/:id teachers.write teachers',
      'DELETE /teachers/:id/time-off/:timeOffId availability.write teachers',
      'GET /guardians guardians.read guardians',
      'GET /guardians/:id guardians.read guardians',
      'GET /people/guardians students.attach_guardian people',
      'GET /people/students/:id people.edit people',
      'GET /students students.read students',
      'GET /students/:id students.read students',
      'GET /students/status-counts students.read students',
      'GET /students/teacher-options students.read students',
      'GET /teachers teachers.read teachers',
      'GET /teachers/:id teachers.read teachers',
      'GET /teachers/:id/availability availability.read teachers',
      'GET /teachers/:id/time-off availability.read teachers',
      'GET /teachers/me/students self.teacher teachers',
      'PATCH /admin/users/:id/test users.write users',
      'PATCH /guardians/:id guardians.write guardians',
      'PATCH /people/guardians/:id people.edit people',
      'PATCH /people/students/:id people.edit people',
      'PATCH /people/students/:id/contact-self people.switch_role people',
      'PATCH /students/:id students.write students',
      'PATCH /students/:id/test students.write students',
      'PATCH /teachers/:id teachers.write teachers',
      'POST /guardians guardians.write guardians',
      'POST /people/guardians/:id/to-student people.switch_role people',
      'POST /people/students/:id/guardian students.attach_guardian people',
      'POST /people/students/:id/to-guardian people.switch_role people',
      'POST /students students.write students',
      'POST /students/:id/merge students.write students',
      'POST /teachers teachers.write teachers',
      'POST /teachers/:id/time-off availability.write teachers',
      'PUT /teachers/:id/availability availability.write teachers',
      'PUT /teachers/:id/time-off/:timeOffId availability.write teachers',
    ]);
  });
});

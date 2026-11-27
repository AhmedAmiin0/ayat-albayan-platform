import { describe, expect, it } from 'vitest';
import { googleMapRoutes as routes } from '..';
import { aCalendarView, aStudentRow, aTeacherRow, TEACHER_ID } from './google-map.fixtures';

const FOLDER = '1AbCdEfGhIjKlMnOpQrStUv';

describe('googleMapRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /admin/google/teachers',
      'PUT /admin/google/teachers/:id',
      'GET /admin/google/teachers/:id/calendar-owner',
      'PUT /admin/google/teachers/:id/calendar-owner',
      'GET /admin/google/students',
      'PUT /admin/google/students/:id',
      'DELETE /admin/google/students/:id',
    ]);
  });

  it('lets settings readers see the mappings, and writers change them', () => {
    const reads: unknown[] = [routes.teachers, routes.calendarOwner, routes.students];
    for (const route of Object.values(routes)) {
      const key = reads.includes(route) ? 'settings.read' : 'settings.write';
      expect(route.permissions).toEqual([key]);
      expect(route.tags).toEqual(['google-sync']);
    }
  });

  it('answers the teacher rows to the list and to a confirmed calendar', () => {
    for (const route of [routes.teachers, routes.setTeacher]) {
      expect(route.response.parse([aTeacherRow()])).toEqual([aTeacherRow()]);
    }
    const bad = { ...aTeacherRow(), teacher_id: 'teacher-1' };
    expect(routes.teachers.response.safeParse([bad]).success).toBe(false);
  });

  it('answers one student row to a confirmed or removed folder', () => {
    for (const route of [routes.setStudent, routes.unsetStudent]) {
      expect(route.response.parse(aStudentRow())).toEqual(aStudentRow());
    }
    expect(routes.students.response.parse([aStudentRow()])).toEqual([aStudentRow()]);
    const bad = { ...aStudentRow(), confirmed_at: '2026-11-27 10:00' };
    expect(routes.setStudent.response.safeParse(bad).success).toBe(false);
  });

  it('answers the calendar owner view and refuses an unknown owner or a negative count', () => {
    for (const route of [routes.calendarOwner, routes.setCalendarOwner]) {
      expect(route.response.parse(aCalendarView())).toEqual(aCalendarView());
    }
    const bad = [{ owner: 'teacher' }, { managed: -1 }];
    for (const change of bad) {
      const view = { ...aCalendarView(), ...change };
      expect(routes.calendarOwner.response.safeParse(view).success).toBe(false);
    }
  });

  it('takes a uuid id and the bodies of the request schemas', () => {
    expect(routes.setTeacher.params.parse({ id: TEACHER_ID })).toEqual({ id: TEACHER_ID });
    expect(routes.unsetStudent.params.safeParse({ id: 'student-1' }).success).toBe(false);
    expect(routes.setTeacher.body.parse({ calendar_id: null })).toEqual({ calendar_id: null });
    expect(routes.setCalendarOwner.body.safeParse({ owner: 'teacher' }).success).toBe(false);
    const sheetOnly = { folder_id: null, attendance_sheet_id: FOLDER };
    expect(routes.setStudent.body.safeParse(sheetOnly).success).toBe(false);
  });

  it('takes the student search as an optional text', () => {
    expect(routes.students.query.parse({})).toEqual({});
    expect(routes.students.query.parse({ q: 'AB-0002' })).toEqual({ q: 'AB-0002' });
  });
});

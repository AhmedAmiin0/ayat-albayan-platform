import type { GoogleStudentMapRow, GoogleTeacherMapRow, TeacherCalendarView } from '..';

const AT = '2026-11-27T10:00:00.123456+00:00';

export const TEACHER_ID = '5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
export const STUDENT_ID = '6e2f3a4b-5c6d-4e7f-8a81-92a3b4c5d6e7';

export const aTeacherRow = (): GoogleTeacherMapRow => ({
  teacher_id: TEACHER_ID,
  name: 'Teacher',
  calendar_id: 'c1@group.calendar.google.com',
  calendar_name: 'A',
  confirmed_at: AT,
  suggestion: { id: 'c1@group.calendar.google.com', name: 'A' },
});

export const aStudentRow = (): GoogleStudentMapRow => ({
  student_id: STUDENT_ID,
  code: 'AB-0001',
  name: 'Student',
  folder_id: null,
  attendance_sheet_id: null,
  create_new: false,
  confirmed_at: null,
  suggestion: { folder_id: '1AbCdEfGhIjKlMnOpQrStUv', attendance_sheet_id: null, name: 'S' },
});

export const aCalendarView = (): TeacherCalendarView => ({
  teacher_id: TEACHER_ID,
  owner: 'script',
  changed_at: null,
  managed: 4,
  script_event_present: 1,
});

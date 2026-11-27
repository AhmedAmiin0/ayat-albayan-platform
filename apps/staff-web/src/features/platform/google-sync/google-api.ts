import { googleAdminCalls, googleMapCalls } from '@ab/client-core';
import type { GoogleStudentMapInput, TeacherCalendarOwner } from '@ab/catalog';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { googleKeys } from '@/features/platform/keys';

// The Google sync admin API (docs/24 §3): every route needs a signed-in admin.

const google = googleAdminCalls({ apiFetch, apiSend });
const map = googleMapCalls({ apiFetch, apiSend });

/** GET /admin/google/status: connection, settings, drive, discovery, counts. */
export const googleStatusQuery = queryOptions({
  queryKey: googleKeys.status(),
  queryFn: () => google.status(),
});

/** GET /admin/google/teachers: one row per active teacher. */
export const googleTeachersQuery = queryOptions({
  queryKey: googleKeys.teachers(),
  queryFn: () => map.teachers(),
});

/** GET /admin/google/students?q=: trial/active students (max 200). */
export const googleStudentsQuery = (q: string) =>
  queryOptions({
    queryKey: googleKeys.studentSearch(q),
    queryFn: () => map.students({ q }),
  });

/** GET /admin/google/items: the last 100 sync items, newest first. */
export const googleItemsQuery = queryOptions({
  queryKey: googleKeys.items(),
  queryFn: () => google.items(),
});

/** GET /admin/google/connect: the consent URL the browser goes to. */
export const getConnectUrl = google.connect;

export const disconnectGoogle = google.disconnect;

export const putGoogleSettings = google.settings;

export const discoverGoogle = google.discover;

export const putGoogleDrive = google.drive;

export const putTeacherCalendar = (input: { teacherId: string; calendarId: string | null }) =>
  map.setTeacher({ id: input.teacherId }, { calendar_id: input.calendarId });

export const putStudentFolder = (input: { studentId: string; body: GoogleStudentMapInput }) =>
  map.setStudent({ id: input.studentId }, input.body);

export const deleteStudentFolder = (studentId: string) => map.unsetStudent({ id: studentId });

export const retryGoogleItem = (id: string) => google.retry({ id });

export const reconcileGoogle = google.reconcile;

export const teacherCalendarQuery = (teacherId: string) =>
  queryOptions({
    queryKey: googleKeys.teacherCalendar(teacherId),
    queryFn: () => map.calendarOwner({ id: teacherId }),
  });

export const putTeacherCalendarOwner = (input: {
  teacherId: string;
  owner: TeacherCalendarOwner;
}) => map.setCalendarOwner({ id: input.teacherId }, { owner: input.owner });

import { googleAdminCalls } from '@ab/client-core';
import type {
  GoogleStudentMapInput,
  GoogleStudentMapRow,
  GoogleTeacherMapRow,
  TeacherCalendarOwner,
  TeacherCalendarView,
} from '@ab/catalog';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { googleKeys } from '@/features/platform/keys';

// The Google sync admin API (docs/24 §3): every route needs a signed-in admin.

const BASE = '/admin/google';

const google = googleAdminCalls({ apiFetch, apiSend });

/** GET /admin/google/status: connection, settings, drive, discovery, counts. */
export const googleStatusQuery = queryOptions({
  queryKey: googleKeys.status(),
  queryFn: () => google.status(),
});

/** GET /admin/google/teachers: one row per active teacher. */
export const googleTeachersQuery = queryOptions({
  queryKey: googleKeys.teachers(),
  queryFn: () => apiFetch<GoogleTeacherMapRow[]>(`${BASE}/teachers`),
});

/** GET /admin/google/students?q=: trial/active students (max 200). */
export const googleStudentsQuery = (q: string) =>
  queryOptions({
    queryKey: googleKeys.studentSearch(q),
    queryFn: () => apiFetch<GoogleStudentMapRow[]>(`${BASE}/students?q=${encodeURIComponent(q)}`),
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
  apiSend<GoogleTeacherMapRow[]>('PUT', `${BASE}/teachers/${input.teacherId}`, { calendar_id: input.calendarId });

export const putStudentFolder = (input: { studentId: string; body: GoogleStudentMapInput }) =>
  apiSend<GoogleStudentMapRow>('PUT', `${BASE}/students/${input.studentId}`, input.body);

export const deleteStudentFolder = (studentId: string) => apiSend<GoogleStudentMapRow>('DELETE', `${BASE}/students/${studentId}`);

export const retryGoogleItem = (id: string) => google.retry({ id });

export const reconcileGoogle = google.reconcile;

export const teacherCalendarQuery = (teacherId: string) =>
  queryOptions({
    queryKey: googleKeys.teacherCalendar(teacherId),
    queryFn: () => apiFetch<TeacherCalendarView>(`${BASE}/teachers/${teacherId}/calendar-owner`),
  });

export const putTeacherCalendarOwner = (input: {
  teacherId: string;
  owner: TeacherCalendarOwner;
}) =>
  apiSend<TeacherCalendarView>('PUT', `${BASE}/teachers/${input.teacherId}/calendar-owner`, {
    owner: input.owner,
  });

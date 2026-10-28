import type {
  GoogleDriveInput,
  GoogleSettingsInput,
  GoogleStatusView,
  GoogleStudentMapInput,
  GoogleStudentMapRow,
  GoogleSyncItemView,
  GoogleTeacherMapRow,
  TeacherCalendarOwner,
  TeacherCalendarView,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// The Google sync admin API (docs/24 §3): every route needs a signed-in admin.

const BASE = '/admin/google';

/** GET /admin/google/status: connection, settings, drive, discovery, counts. */
export const googleStatusQuery = queryOptions({
  queryKey: ['google', 'status'],
  queryFn: () => apiFetch<GoogleStatusView>(`${BASE}/status`),
});

/** GET /admin/google/teachers: one row per active teacher. */
export const googleTeachersQuery = queryOptions({
  queryKey: ['google', 'teachers'],
  queryFn: () => apiFetch<GoogleTeacherMapRow[]>(`${BASE}/teachers`),
});

/** GET /admin/google/students?q=: trial/active students (max 200). */
export const googleStudentsQuery = (q: string) =>
  queryOptions({
    queryKey: ['google', 'students', q],
    queryFn: () => apiFetch<GoogleStudentMapRow[]>(`${BASE}/students?q=${encodeURIComponent(q)}`),
  });

/** GET /admin/google/items: the last 100 sync items, newest first. */
export const googleItemsQuery = queryOptions({
  queryKey: ['google', 'items'],
  queryFn: () => apiFetch<GoogleSyncItemView[]>(`${BASE}/items`),
});

/** GET /admin/google/connect: the consent URL the browser goes to. */
export const getConnectUrl = () => apiFetch<{ url: string }>(`${BASE}/connect`);

export const disconnectGoogle = () => apiSend<GoogleStatusView>('POST', `${BASE}/disconnect`);

export const putGoogleSettings = (input: GoogleSettingsInput) => apiSend<GoogleStatusView>('PUT', `${BASE}/settings`, input);

export const discoverGoogle = () => apiSend<GoogleStatusView>('POST', `${BASE}/discover`);

export const putGoogleDrive = (input: GoogleDriveInput) => apiSend<GoogleStatusView>('PUT', `${BASE}/drive`, input);

export const putTeacherCalendar = (input: { teacherId: string; calendarId: string | null }) =>
  apiSend<GoogleTeacherMapRow[]>('PUT', `${BASE}/teachers/${input.teacherId}`, { calendar_id: input.calendarId });

export const putStudentFolder = (input: { studentId: string; body: GoogleStudentMapInput }) =>
  apiSend<GoogleStudentMapRow>('PUT', `${BASE}/students/${input.studentId}`, input.body);

export const deleteStudentFolder = (studentId: string) => apiSend<GoogleStudentMapRow>('DELETE', `${BASE}/students/${studentId}`);

export const retryGoogleItem = (id: string) => apiSend<GoogleSyncItemView>('POST', `${BASE}/items/${id}/retry`);

export const reconcileGoogle = () => apiSend<{ queued: number }>('POST', `${BASE}/reconcile`);

/** GET /admin/google/teachers/:id/calendar-owner: «تقويم المعلم» (script / platform) and its counts. */
export const teacherCalendarQuery = (teacherId: string) =>
  queryOptions({
    queryKey: ['google', 'teacher-calendar', teacherId],
    queryFn: () => apiFetch<TeacherCalendarView>(`${BASE}/teachers/${teacherId}/calendar-owner`),
  });

export const putTeacherCalendarOwner = (input: { teacherId: string; owner: TeacherCalendarOwner }) =>
  apiSend<TeacherCalendarView>('PUT', `${BASE}/teachers/${input.teacherId}/calendar-owner`, { owner: input.owner });

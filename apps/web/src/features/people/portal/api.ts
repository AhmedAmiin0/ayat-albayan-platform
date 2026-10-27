import type { PortalFileUrl, PortalHome, PortalLessons, PortalPackageView, PortalReports, RoomJoinResult } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// The family portal's reads (docs/31). Every student route is scoped by the API to the login's own students.

const KEY = ['portal'] as const;
/** The join window turns on by itself: lessons are re-read every 30 seconds, like the student's link page. */
export const PORTAL_REFRESH_MS = 30_000;

export const portalHomeQuery = queryOptions({
  queryKey: [...KEY, 'me'],
  queryFn: () => apiFetch<PortalHome>('/portal/me'),
});

export const portalLessonsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...KEY, studentId, 'lessons'],
    queryFn: () => apiFetch<PortalLessons>(`/portal/students/${studentId}/lessons`),
    refetchInterval: PORTAL_REFRESH_MS,
  });

export const portalReportsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...KEY, studentId, 'reports'],
    queryFn: () => apiFetch<PortalReports>(`/portal/students/${studentId}/reports`),
  });

export const portalPackageQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...KEY, studentId, 'package'],
    queryFn: () => apiFetch<PortalPackageView>(`/portal/students/${studentId}/package`),
  });

/** The student's guest admission to our classroom (inside the window only). */
export const portalJoin = (input: { studentId: string; lessonId: string }) =>
  apiSend<RoomJoinResult>('POST', `/portal/students/${input.studentId}/lessons/${input.lessonId}/join`);

/** A signed link to a sent report's PDF (5 minutes) or a visible recording (an hour), minted per tap. */
export const portalFileUrl = (input: { studentId: string; kind: 'reports' | 'recordings'; id: string }) =>
  apiSend<PortalFileUrl>('POST', `/portal/students/${input.studentId}/${input.kind}/${input.id}/url`);

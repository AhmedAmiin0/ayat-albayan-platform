import type { AssistantLessonView, AssistantView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey } from '@ab/mobile-kit';

/** A non-list body (older API, a stub) reads as no assistants, not a student-screen crash. */
const asList = (data: AssistantView[]): AssistantView[] => (Array.isArray(data) ? data : []);

/** GET /students/:id/assistants. */
export const useStudentAssistants = (studentId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: pathKey(`/students/${studentId}/assistants`),
    queryFn: () => apiFetch<AssistantView[]>(`/students/${studentId}/assistants`),
    select: asList,
  });

/** GET /assistants (admin): every assistant login; the picker offers those not yet assigned. */
export const useAllAssistants = (enabled: boolean) =>
  useQuery({ queryKey: pathKey('/assistants'), queryFn: () => apiFetch<AssistantView[]>('/assistants'), select: asList, enabled });

/** POST /students/:id/assistants {profileId}: answers the new list. */
export const assignAssistant = ({
  studentId,
  profileId,
}: {
  studentId: string;
  profileId: string;
}) => apiSend<AssistantView[]>('POST', `/students/${studentId}/assistants`, { profileId });

/** DELETE /students/:id/assistants/:profileId: answers the new list. */
export const removeAssistant = ({
  studentId,
  profileId,
}: {
  studentId: string;
  profileId: string;
}) => apiSend<AssistantView[]>('DELETE', `/students/${studentId}/assistants/${profileId}`);

/** GET /assistants/me/lessons for a [from, to) day: the assistant's own sessions. */
export const useAssistantLessons = (day: { from: string; to: string }) =>
  useQuery({
    queryKey: [...pathKey('/assistants/me/lessons'), day],
    queryFn: () => apiFetch<AssistantLessonView[]>(`/assistants/me/lessons${toQueryString(day)}`),
  });

import type { AssistantLessonView, AssistantView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

/** A body that is not a list (an older API, a stub) reads as no assistants rather than crashing the student screen. */
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
export const assignAssistant = ({ studentId, profileId }: { studentId: string; profileId: string }) =>
  apiSend<AssistantView[]>('POST', `/students/${studentId}/assistants`, { profileId });

/** DELETE /students/:id/assistants/:profileId: answers the new list. */
export const removeAssistant = ({ studentId, profileId }: { studentId: string; profileId: string }) =>
  apiSend<AssistantView[]>('DELETE', `/students/${studentId}/assistants/${profileId}`);

/** GET /assistants/me/lessons for a [from, to) day (the assistant's own sessions; role `assistant`). */
export const useAssistantLessons = (day: { from: string; to: string }) =>
  useQuery({
    queryKey: [...pathKey('/assistants/me/lessons'), day],
    queryFn: () => apiFetch<AssistantLessonView[]>(`/assistants/me/lessons${toQueryString(day)}`),
  });

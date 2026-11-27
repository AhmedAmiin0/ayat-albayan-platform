import { assistantsApi } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const api = assistantsApi({ apiFetch, apiSend });

export const useStudentAssistants = (studentId: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: pathKey(`/students/${studentId}/assistants`),
    queryFn: () => api.forStudent(studentId),
  });

/** Admin: every assistant login; the picker offers those not yet assigned. */
export const useAllAssistants = (enabled: boolean) =>
  useQuery({ queryKey: pathKey('/assistants'), queryFn: api.all, enabled });

/** Both answer the student's new list. */
export const assignAssistant = api.assign;
export const removeAssistant = api.remove;

/** The assistant's own sessions of one [from, to) day. */
export const useAssistantLessons = (day: { from: string; to: string }) =>
  useQuery({
    queryKey: [...pathKey('/assistants/me/lessons'), day],
    queryFn: () => api.mine(day),
  });

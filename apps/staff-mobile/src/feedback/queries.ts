import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import type { FeedbackRowView, TeacherFeedbackSummary, TeacherFeedbackView } from './types';

/** GET /feedback (admin): every request and answer, newest first, paged. */
export const useFeedbackList = () => usePagedList<FeedbackRowView>({ path: '/feedback' });

/** GET /feedback/summary (admin): the average, answers and yes share per teacher. */
export function useFeedbackSummary() {
  const path = '/feedback/summary';
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<TeacherFeedbackSummary[]>(path),
  });
}

/** GET /teachers/me/feedback: only my rows (no contact number, no guardian) and my average. */
export function useMyFeedback() {
  const path = '/teachers/me/feedback';
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TeacherFeedbackView>(path) });
}

/**
 * POST /lessons/:id/feedback-request {studentId}: queues the WhatsApp request to the guardian
 * (an explicit admin send; nothing sends it by itself). The list and averages refetch after.
 */
export function useSendFeedbackRequest(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiSend('POST', `/lessons/${lessonId}/feedback-request`, { studentId }),
    onSuccess: () => client.invalidateQueries({ queryKey: pathKey('/feedback') }),
  });
}

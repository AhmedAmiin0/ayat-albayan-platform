import { feedbackCalls } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, listKey, pathKey } from '@ab/mobile-kit';
import { usePagedPages } from '@/core/lib/query/use-paged-pages';

const feedback = feedbackCalls({ apiFetch, apiSend });
const PAGE_SIZE = 25;

/** GET /feedback (admin): every request and answer, newest first, paged. */
export const useFeedbackList = () =>
  usePagedPages({
    queryKey: listKey('/feedback', {}),
    loadPage: (page) => feedback.list({ page, pageSize: PAGE_SIZE }),
  });

/** GET /feedback/summary (admin): the average, answers and yes share per teacher. */
export function useFeedbackSummary() {
  return useQuery({ queryKey: pathKey('/feedback/summary'), queryFn: () => feedback.summary() });
}

/** GET /teachers/me/feedback: only my rows (no contact number, no guardian) and my average. */
export function useMyFeedback() {
  return useQuery({ queryKey: pathKey('/teachers/me/feedback'), queryFn: () => feedback.mine() });
}

/**
 * POST /lessons/:id/feedback-request {studentId}: queues the WhatsApp request to the guardian
 * (an explicit admin send; nothing sends it by itself). The list and averages refetch after.
 */
export function useSendFeedbackRequest(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => feedback.request({ lessonId, studentId }),
    onSuccess: () => client.invalidateQueries({ queryKey: pathKey('/feedback') }),
  });
}

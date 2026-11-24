import { answeredLessonSchema, familyRequestsSchema, type AnsweredLesson } from '@ab/shared';
import type { ProposalApprove } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// Family reschedule requests and their answers; parsed (rule 12).

const PATH = '/family-requests';

export function useFamilyRequests() {
  return useQuery({
    queryKey: pathKey(PATH),
    queryFn: async () => familyRequestsSchema.parse(await apiFetch(PATH)),
  });
}

export type Answer =
  | { kind: 'approve'; body: ProposalApprove }
  | { kind: 'reject'; note: string };

const bodyOf = (a: Answer): object => (a.kind === 'approve' ? a.body : { note: a.note || undefined });

/**
 * Approve (a reschedule: 409 conflict when the time was taken meanwhile) or reject with a note
 * the family reads. Either way the requests and every lesson list refetch.
 */
export function useAnswerRequest(proposalId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (a: Answer): Promise<AnsweredLesson> =>
      apiSend('POST', `${PATH}/${proposalId}/${a.kind}`, bodyOf(a)).then((r: unknown) =>
        answeredLessonSchema.parse(r),
      ),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: pathKey(PATH) }),
        client.invalidateQueries({ queryKey: pathKey('/lessons') }),
      ]),
  });
}

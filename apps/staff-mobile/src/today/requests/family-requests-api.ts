import { familyRequestCalls } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import type { Answer, AnswerKind, AnswerSenders } from './family-requests.types';

const PATH = '/family-requests';
const requests = familyRequestCalls({ apiFetch, apiSend });

export function useFamilyRequests() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => requests.pending() });
}

const SENDERS: AnswerSenders = {
  approve: (id, answer) => requests.approve({ id }, answer.body),
  reject: (id, answer) => requests.reject({ id }, { note: answer.note || undefined }),
};

const sendAnswer = <K extends AnswerKind>(id: string, answer: Answer<K>) =>
  SENDERS[answer.kind](id, answer);

/**
 * Approve (a reschedule: 409 conflict when the time was taken meanwhile) or reject with a note
 * the family reads. Either way the requests and every lesson list refetch.
 */
export function useAnswerRequest(proposalId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (answer: Answer) => sendAnswer(proposalId, answer),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: pathKey(PATH) }),
        client.invalidateQueries({ queryKey: pathKey('/lessons') }),
      ]),
  });
}

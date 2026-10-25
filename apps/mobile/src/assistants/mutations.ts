import type { AssistantStatementView, AssistantTermsInput, AssistantTermsView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { ASSISTANTS_KEY } from './api';

// The admin's writes (web api.ts + the dialogs): each re-reads everything under ['assistant-pay'] on success.

const useRefresh = () => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ASSISTANTS_KEY });
};

/** PUT /assistant-pay/terms/:assistantId: both parts replaced; null clears one. */
export function useSaveTerms() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { assistantId: string; body: AssistantTermsInput }) =>
      apiSend<AssistantTermsView>('PUT', `/assistant-pay/terms/${input.assistantId}`, input.body),
    onSuccess: refresh,
  });
}

/** POST /assistant-pay/commissions/:id/void {reason}: audited; the money side effects are the database's. */
export function useVoidCommission() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      apiSend<{ id: string }>('POST', `/assistant-pay/commissions/${input.id}/void`, { reason: input.reason }),
    onSuccess: refresh,
  });
}

export type StatementMove = { id: string; move: 'approve' | 'reopen' } | { id: string; move: 'unpay'; reason: string };

/** POST /assistant-pay/statements/:id/{approve|reopen|unpay}; un-paying carries its reason. */
export function useStatementMove() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (m: StatementMove) =>
      apiSend<AssistantStatementView>(
        'POST',
        `/assistant-pay/statements/${m.id}/${m.move}`,
        m.move === 'unpay' ? { reason: m.reason } : undefined,
      ),
    onSuccess: refresh,
  });
}

/**
 * «احسب كشوف الشهر»: POST /assistant-pay/statements {assistantId, month} for each target (idempotent:
 * a draft is rebuilt). Every request runs; the first refusal is reported. Re-reads whatever happened.
 */
export function useGenerateStatements() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: { assistantIds: readonly string[]; month: string }) => {
      const results = await Promise.allSettled(
        input.assistantIds.map((assistantId) =>
          apiSend<AssistantStatementView>('POST', '/assistant-pay/statements', { assistantId, month: input.month }),
        ),
      );
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) throw failed.reason;
    },
    onSettled: refresh,
  });
}

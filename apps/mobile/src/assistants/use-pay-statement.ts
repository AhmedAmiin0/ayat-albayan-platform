import type { AssistantStatementView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { payBody, type PayDraft } from '@/finance/payout-actions';
import { apiSend } from '@/core/lib/http/api';
import { ASSISTANTS_KEY } from './api';
import { uploadStatementReceipt } from './upload-receipt';

/**
 * «تأكيد الدفع» of a statement (web use-pay-statement): the receipt goes up first, once per photo (a
 * retry after a refused pay does not upload it again), then POST /assistant-pay/statements/:id/pay
 * with paidAt, method, note and receiptPath (payoutPaySchema).
 */
export function usePayStatement(statement: Pick<AssistantStatementView, 'id' | 'assistant'>) {
  const client = useQueryClient();
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      if (draft.receipt && uploaded.current?.uri !== draft.receipt.uri) {
        uploaded.current = { uri: draft.receipt.uri, path: await uploadStatementReceipt(statement.assistant.id, draft.receipt) };
      }
      const path = draft.receipt ? (uploaded.current?.path ?? null) : null;
      return apiSend<AssistantStatementView>('POST', `/assistant-pay/statements/${statement.id}/pay`, payBody(draft, path, new Date()));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ASSISTANTS_KEY }),
  });
}

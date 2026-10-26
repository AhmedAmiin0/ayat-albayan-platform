import { uploadOnce } from '@ab/client-core';
import type { AssistantStatementView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { payBody, type PayDraft } from '@/finance/payouts/payout-actions';
import { apiSend } from '@/core/lib/http/api';
import { ASSISTANTS_KEY } from '../../api/api';
import { uploadStatementReceipt } from './upload-receipt';

/**
 * «تأكيد الدفع» of a statement (web use-pay-statement): the receipt goes up first, once per photo (a
 * retry after a refused pay does not upload it again), then POST /assistant-pay/statements/:id/pay
 * with paidAt, method, note and receiptPath (payoutPaySchema).
 */
export function usePayStatement(statement: Pick<AssistantStatementView, 'id' | 'assistant'>) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      const { receipt } = draft;
      const path = receipt ? await receiptOnce(receipt.uri, () => uploadStatementReceipt(statement.assistant.id, receipt)) : null;
      return apiSend<AssistantStatementView>('POST', `/assistant-pay/statements/${statement.id}/pay`, payBody(draft, path, new Date()));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ASSISTANTS_KEY }),
  });
}

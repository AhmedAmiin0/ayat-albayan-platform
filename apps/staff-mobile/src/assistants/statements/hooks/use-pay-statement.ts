import { uploadOnce } from '@ab/client-core';
import type { AssistantStatementView } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { payBody, type PayDraft } from '@/finance/payouts/payout-actions';
import { apiSend } from '@ab/mobile-kit';
import { ASSISTANTS_KEY } from '@/assistants/api/api';
import { uploadStatementReceipt } from './upload-receipt';

/** The receipt uploads once per photo, so a retry after a refused pay does not re-upload. */
export function usePayStatement(statement: Pick<AssistantStatementView, 'id' | 'assistant'>) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  return useMutation({
    mutationFn: async (draft: PayDraft) => {
      const { receipt } = draft;
      const path = receipt
        ? await receiptOnce(receipt.uri, () =>
            uploadStatementReceipt(statement.assistant.id, receipt),
          )
        : null;
      return apiSend<AssistantStatementView>(
        'POST',
        `/assistant-pay/statements/${statement.id}/pay`,
        payBody(draft, path, new Date()),
      );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ASSISTANTS_KEY }),
  });
}

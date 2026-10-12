import type { SalesPaymentView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { apiSend } from '@/lib/api';
import { requestId } from '@/lib/request-id';
import { refreshFamily } from './family';
import type { TransferInput } from './transfer-form';
import { uploadSalesReceipt } from './upload-sales-receipt';

/**
 * «سجّل التحويل» → POST /sales/payments (R-ASST-04). A photo goes up first, once per file (a retry
 * after a failed POST reuses its path); a chat receipt is already copied. ONE clientRequestId per
 * open screen, so a retry after a lost reply never records the transfer twice (rule 8). Never sends
 * kind, method or invoiceId: the API's bank transfer. Then the chat and the family refetch.
 */
export function useSalesPayment(phone: string) {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  const uploaded = useRef<{ key: string; path: string } | null>(null);

  async function receiptPath(input: TransferInput): Promise<string> {
    const choice = input.receipt;
    if (choice.kind === 'chat') return choice.path;
    const key = `${input.subscriptionId} ${choice.receipt.uri}`;
    if (uploaded.current?.key !== key) {
      uploaded.current = { key, path: await uploadSalesReceipt(input.subscriptionId, choice.receipt) };
    }
    return uploaded.current.path;
  }

  return useMutation({
    mutationKey: ['sales', 'payments', 'create'],
    mutationFn: async (input: TransferInput) => {
      const path = await receiptPath(input);
      return apiSend<SalesPaymentView>('POST', '/sales/payments', {
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        currency: input.currency,
        paidAt: input.paidAt,
        receiptPath: path,
        ...(input.note === null ? {} : { note: input.note }),
        clientRequestId,
      });
    },
    onSettled: () => refreshFamily(client, phone),
  });
}

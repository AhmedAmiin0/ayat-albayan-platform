import type { SalesPaymentView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import { useAttachmentPaths } from '@/payments/attachments';
import { refreshFamily } from './family';
import type { TransferInput } from './transfer-form';
import { uploadSalesReceipt } from './upload-sales-receipt';

/**
 * «سجّل التحويل» → POST /sales/payments (R-ASST-04). Each photo of «المرفقات» goes up first, once
 * per file (a retry after a failed POST reuses its path); a chat file is already copied. None is
 * fine (owner 2026-10-12). ONE clientRequestId per open screen, so a retry after a lost reply never
 * records the transfer twice (rule 8). Never sends kind, method or invoiceId: the API's bank
 * transfer. Then the chat and the family refetch.
 */
export function useSalesPayment(phone: string) {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  const attachmentPaths = useAttachmentPaths(uploadSalesReceipt);

  return useMutation({
    mutationKey: ['sales', 'payments', 'create'],
    mutationFn: async (input: TransferInput) => {
      const attachments = await attachmentPaths(input.subscriptionId, input.attachments);
      return apiSend<SalesPaymentView>('POST', '/sales/payments', {
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        currency: input.currency,
        paidAt: input.paidAt,
        ...(attachments.length ? { attachments } : {}),
        ...(input.note === null ? {} : { note: input.note }),
        clientRequestId,
      });
    },
    onSettled: () => refreshFamily(client, phone),
  });
}

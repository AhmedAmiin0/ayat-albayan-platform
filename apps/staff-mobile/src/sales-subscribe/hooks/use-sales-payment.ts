import { salesPaymentCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { useAttachmentPaths } from '@/payments/receipts/attachments';
import { refreshFamily } from '@/sales-subscribe/lib/family';
import type { TransferInput } from '@/sales-subscribe/lib/transfer-form';
import { uploadSalesReceipt } from './upload-sales-receipt';

const payments = salesPaymentCalls({ apiFetch, apiSend });

/** R-ASST-04, rule 8: one id per screen; each photo uploads once; the API sets the bank method. */
export function useSalesPayment(phone: string, bind: { phone?: string } = {}) {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  const attachmentPaths = useAttachmentPaths((id, receipt) =>
    uploadSalesReceipt(id, receipt, bind),
  );

  return useMutation({
    mutationKey: ['sales', 'payments', 'create'],
    mutationFn: async (input: TransferInput) => {
      const attachments = await attachmentPaths(input.subscriptionId, input.attachments);
      return payments.create({
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        currency: input.currency,
        paidAt: input.paidAt,
        ...(attachments.length ? { attachments } : {}),
        ...(input.note === null ? {} : { note: input.note }),
        clientRequestId,
        ...bind,
      });
    },
    onSettled: () => refreshFamily(client, phone),
  });
}

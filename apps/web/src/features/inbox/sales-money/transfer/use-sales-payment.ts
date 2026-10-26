import { parseAmount, type SalesMoneySubscriptionView, type SalesPaymentView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/payments/api';
import { useUploadOnce } from '@/features/payments/attachments/attachments';
import { recordSalesPayment, refreshAfterSalesWrite, uploadSalesReceipt } from '../api';
import type { ReceiptChoice } from './receipt';

export interface TransferForm {
  /** Text while typing (Arabic digits too); parseAmount reads it on submit. */
  amount: string;
  /** Local day (YYYY-MM-DD, Riyadh); paidAtFor turns it into an instant. */
  day: string;
  note: string;
}

export type TransferInput = { sub: SalesMoneySubscriptionView; form: TransferForm; attachments: ReceiptChoice[] };

/**
 * The «سجّل التحويل» save (R-ASST-04): one clientRequestId per open step, re-sent on every retry, and each
 * uploaded attachment sent to storage once per file (a chat file is already copied). «المرفقات» are optional
 * (owner 2026-10-12). Never kind / method; the currency is always the package's.
 */
export function useSalesPayment(onSaved: (payment: SalesPaymentView) => void) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploadOnce = useUploadOnce(uploadSalesReceipt);

  async function attachmentPaths(sub: SalesMoneySubscriptionView, list: ReceiptChoice[]): Promise<string[]> {
    const paths: string[] = [];
    for (const c of list) paths.push(c.kind === 'chat' ? c.path : await uploadOnce(sub.id, c.file));
    return [...new Set(paths)];
  }

  return useMutation({
    mutationFn: async ({ sub, form, attachments }: TransferInput) => {
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      return recordSalesPayment({
        subscriptionId: sub.id,
        amount,
        currency: sub.currency,
        paidAt: paidAtFor(form.day),
        attachments: await attachmentPaths(sub, attachments),
        note: form.note.trim() || null,
        clientRequestId: requestId,
      });
    },
    onSuccess: async (payment) => {
      await refreshAfterSalesWrite(queryClient);
      onSaved(payment);
    },
    onError: () => void refreshAfterSalesWrite(queryClient),
  });
}

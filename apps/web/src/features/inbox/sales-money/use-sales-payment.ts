import { parseAmount, type SalesMoneySubscriptionView, type SalesPaymentView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { paidAtFor } from '@/features/payments/api';
import { recordSalesPayment, refreshAfterSalesWrite, uploadSalesReceipt } from './api';
import type { ReceiptChoice } from './receipt';

export interface TransferForm {
  /** Text while typing (Arabic digits too); parseAmount reads it on submit. */
  amount: string;
  currency: string;
  /** Local day (YYYY-MM-DD, Riyadh); paidAtFor turns it into an instant. */
  day: string;
  note: string;
}

export type TransferInput = { sub: SalesMoneySubscriptionView; form: TransferForm; receipt: ReceiptChoice };

/**
 * The «سجّل التحويل» save (R-ASST-04): one clientRequestId per open step, re-sent on every retry, and an
 * uploaded receipt sent to storage once per file (a chat receipt is already copied). Never kind / method.
 */
export function useSalesPayment(onSaved: (payment: SalesPaymentView) => void) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploaded = useRef<{ file: File; subscriptionId: string; path: string } | null>(null);

  async function receiptPath(sub: SalesMoneySubscriptionView, receipt: ReceiptChoice): Promise<string> {
    if (receipt.kind === 'chat') return receipt.path;
    const done = uploaded.current;
    if (done?.file === receipt.file && done.subscriptionId === sub.id) return done.path;
    const path = await uploadSalesReceipt({ subscriptionId: sub.id, file: receipt.file });
    uploaded.current = { file: receipt.file, subscriptionId: sub.id, path };
    return path;
  }

  return useMutation({
    mutationFn: async ({ sub, form, receipt }: TransferInput) => {
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      return recordSalesPayment({
        subscriptionId: sub.id,
        amount,
        currency: form.currency || sub.currency,
        paidAt: paidAtFor(form.day),
        receiptPath: await receiptPath(sub, receipt),
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

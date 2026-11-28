import type { SalesMoneySubscriptionView, SalesPaymentView } from '@ab/shared';
import { parseAmount } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/finance/payments';
import { useUploadOnce } from '@/features/finance/payments';
import { recordSalesPayment, refreshAfterSalesWrite, uploadSalesReceipt, type Bind } from '@/features/sales/sales-money/api';
import type { ReceiptChoice } from './receipt';

export interface TransferForm {
  /** Text while typing (Arabic digits too); parseAmount reads it on submit. */
  amount: string;
  /** Local day (YYYY-MM-DD, Riyadh); paidAtFor turns it into an instant. */
  day: string;
  note: string;
}

export interface TransferInput {
  sub: SalesMoneySubscriptionView;
  form: TransferForm;
  attachments: ReceiptChoice[];
}

/** One clientRequestId per step, re-sent on retry; each upload sent once; package's currency. */
export function useSalesPayment(onSaved: (payment: SalesPaymentView) => void, bind: Bind = {}) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploadOnce = useUploadOnce((input) => uploadSalesReceipt({ ...input, bind }));

  async function attachmentPaths(
    sub: SalesMoneySubscriptionView,
    list: ReceiptChoice[],
  ): Promise<string[]> {
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
        ...bind,
      });
    },
    onSuccess: async (payment) => {
      await refreshAfterSalesWrite(queryClient);
      onSaved(payment);
    },
    onError: () => void refreshAfterSalesWrite(queryClient),
  });
}

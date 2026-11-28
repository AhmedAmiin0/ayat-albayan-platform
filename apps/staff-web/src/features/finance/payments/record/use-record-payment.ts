import type { PaymentKind } from '@ab/catalog';
import { parseAmount, paymentCreateSchema } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MONEY_KEY, type SubscriptionView } from '@/features/finance/subscriptions';
import { paidAtFor, recordPayment, uploadReceipt } from '@/features/finance/payments/api';
import { useUploadOnce } from '@/features/finance/payments/attachments/attachments';
import type { PaymentForm } from './PaymentFields';

export interface SaveInput {
  sub: SubscriptionView;
  form: PaymentForm;
  file: File | null;
  /** Sent only for a bank payment; the dialog clears them when the method changes. */
  attachments?: File[];
  /** What was sent; another currency than the package's is converted by the API (fx at paid_at). */
  currency: string;
  kind: PaymentKind;
  /** The booking's invoice is the receipt, so no upload. */
  invoiceId?: string;
}

/** One clientRequestId per dialog and one upload per file, so a lost reply never books twice. */
export function useRecordPayment(onSaved: () => void) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploadOnce = useUploadOnce(uploadReceipt);

  async function attachmentPaths(sub: SubscriptionView, input: SaveInput): Promise<string[]> {
    if (input.form.method !== 'bank') return [];
    const paths: string[] = [];
    for (const file of input.attachments ?? []) paths.push(await uploadOnce(sub.id, file));
    return paths;
  }

  return useMutation({
    mutationFn: async (input: SaveInput) => {
      const { sub, form, file, currency, kind, invoiceId } = input;
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      const receiptPath = file ? await uploadOnce(sub.id, file) : null;
      const attachments = await attachmentPaths(sub, input);
      return recordPayment({
        subscriptionId: sub.id,
        amount,
        currency,
        kind,
        ...(invoiceId ? { invoiceId } : {}),
        method: paymentCreateSchema.shape.method.parse(form.method),
        paidAt: paidAtFor(form.day),
        receiptPath,
        ...(attachments.length > 0 ? { attachments } : {}),
        note: form.note.trim() || null,
        clientRequestId: requestId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onSaved();
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
}

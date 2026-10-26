import { parseAmount, type PaymentKind } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MONEY_KEY, type SubscriptionView } from '@/features/subscriptions/api';
import { paidAtFor, recordPayment, uploadReceipt } from '../api';
import { useUploadOnce } from '../attachments/attachments';
import type { PaymentForm } from './PaymentFields';

export type SaveInput = {
  sub: SubscriptionView;
  form: PaymentForm;
  file: File | null;
  /** «المرفقات»: sent only for a bank payment (the dialog clears them when the method changes). */
  attachments?: File[];
  /** What was sent; another currency than the package's is converted by the API (fx at paid_at). */
  currency: string;
  kind: PaymentKind;
  /** «سجّل كدفعة»: the booking's invoice is the receipt (no upload). */
  invoiceId?: string;
};

/**
 * The «تسجيل دفعة» save (R-PAY-01). One clientRequestId per open dialog, re-sent on every retry,
 * and a receipt / attachment uploaded once per file: when the reply of a POST that did reach the API is
 * lost, the retry returns that payment instead of booking the money twice or uploading the files again.
 * A failure refetches the money lists, so the admin sees a payment that went through anyway.
 */
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
        method: form.method,
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

import { parseAmount, type PaymentKind } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { MONEY_KEY, type SubscriptionView } from '@/features/subscriptions/api';
import { paidAtFor, recordPayment, uploadReceipt } from './api';
import type { PaymentForm } from './PaymentFields';

export type SaveInput = {
  sub: SubscriptionView;
  form: PaymentForm;
  file: File | null;
  /** What was sent; another currency than the package's is converted by the API (fx at paid_at). */
  currency: string;
  kind: PaymentKind;
  /** «سجّل كدفعة»: the booking's invoice is the receipt (no upload). */
  invoiceId?: string;
};

/**
 * The «تسجيل دفعة» save (R-PAY-01). One clientRequestId per open dialog, re-sent on every retry,
 * and a receipt uploaded once per file: when the reply of a POST that did reach the API is lost,
 * the retry returns that payment instead of booking the money twice or uploading the file again.
 * A failure refetches the money lists, so the admin sees a payment that went through anyway.
 */
export function useRecordPayment(onSaved: () => void) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploaded = useRef<{ file: File; subscriptionId: string; path: string } | null>(null);

  async function receiptPath(sub: SubscriptionView, file: File | null): Promise<string | null> {
    if (!file) return null;
    const done = uploaded.current;
    if (done?.file === file && done.subscriptionId === sub.id) return done.path;
    const path = await uploadReceipt({ subscriptionId: sub.id, file });
    uploaded.current = { file, subscriptionId: sub.id, path };
    return path;
  }

  return useMutation({
    mutationFn: async ({ sub, form, file, currency, kind, invoiceId }: SaveInput) => {
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      return recordPayment({
        subscriptionId: sub.id,
        amount,
        currency,
        kind,
        ...(invoiceId ? { invoiceId } : {}),
        method: form.method,
        paidAt: paidAtFor(form.day),
        receiptPath: await receiptPath(sub, file),
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

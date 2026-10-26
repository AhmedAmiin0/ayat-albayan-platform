import { parseAmount } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { paidAtFor } from '@/features/finance/payments/api';
import type { PaymentForm } from '@/features/finance/payments/record/PaymentFields';
import { earningsKey, payTeacher, uploadTeacherReceipt, type Scope } from '../api';

export type PayInput = { form: PaymentForm; file: File | null; earningIds: string[] | undefined };

/**
 * The «سجّل دفعة» save. One clientRequestId per open dialog, re-sent on every retry, and the
 * receipt uploaded once per file: a reply lost after the API recorded the payment is answered
 * with that payment (replayed) instead of paying the teacher twice.
 */
export function usePayTeacher(teacherId: string, onSaved: (replayed: boolean) => void) {
  const queryClient = useQueryClient();
  const scope: Scope = { kind: 'admin', teacherId };
  const [requestId] = useState(() => crypto.randomUUID());
  const uploaded = useRef<{ file: File; path: string } | null>(null);

  async function receiptPath(file: File | null): Promise<string | null> {
    if (!file) return null;
    if (uploaded.current?.file === file) return uploaded.current.path;
    const path = await uploadTeacherReceipt({ teacherId, file });
    uploaded.current = { file, path };
    return path;
  }

  return useMutation({
    mutationFn: async ({ form, file, earningIds }: PayInput) => {
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      return payTeacher(teacherId, {
        amount,
        method: form.method,
        paidAt: paidAtFor(form.day),
        ...(earningIds ? { earningIds } : {}),
        receiptPath: await receiptPath(file),
        note: form.note.trim() || null,
        clientRequestId: requestId,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: earningsKey(scope) });
      onSaved(result.replayed);
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: earningsKey(scope) }),
  });
}

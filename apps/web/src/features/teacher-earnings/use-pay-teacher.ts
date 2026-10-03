import type { PaymentMethod } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { paidAtFor } from '@/features/payments/api';
import { createTeacherPayment, earningsKeys, uploadTeacherReceipt } from './api';

export type PayInput = {
  amount: number;
  method: PaymentMethod;
  day: string;
  note: string;
  file: File | null;
  /** The ticked sessions; empty = every open one (the API default). */
  earningIds: string[];
};

/**
 * The «سجّل دفعة» save. One clientRequestId per open dialog, re-sent on every retry, and a receipt
 * uploaded once per file: when the reply of a POST that did reach the API is lost, the retry returns
 * that payment instead of booking it twice. A failure refetches, so a payment that went through shows.
 */
export function usePayTeacher(teacherId: string, onSaved: () => void) {
  const queryClient = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: earningsKeys.of(teacherId) });

  async function receiptPath(file: File | null): Promise<string | null> {
    if (!file) return null;
    if (uploaded.current?.file === file) return uploaded.current.path;
    const path = await uploadTeacherReceipt(teacherId, file);
    uploaded.current = { file, path };
    return path;
  }

  return useMutation({
    mutationFn: async (input: PayInput) =>
      createTeacherPayment(teacherId, {
        amount: input.amount,
        method: input.method,
        paidAt: paidAtFor(input.day),
        ...(input.earningIds.length > 0 && { earningIds: input.earningIds }),
        receiptPath: await receiptPath(input.file),
        note: input.note.trim() || null,
        clientRequestId: requestId,
      }),
    onSuccess: async () => {
      await refresh();
      onSaved();
    },
    onError: () => void refresh(),
  });
}

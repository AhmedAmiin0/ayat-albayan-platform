import { uploadOnce } from '@ab/client-core';
import { parseAmount, teacherPaymentCreateSchema } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { paidAtFor } from '@/features/finance/payments/api';
import type { PaymentForm } from '@/features/finance/payments/record/PaymentFields';
import {
  earningsKey,
  payTeacher,
  uploadTeacherReceipt,
  type Scope,
} from '@/features/finance/teacher-earnings/api';

/** The form lists the manual methods only; the platform's card is never a teacher payment. */
const manualMethod = teacherPaymentCreateSchema.shape.method;

export interface PayInput {
  form: PaymentForm;
  file: File | null;
  earningIds: string[] | undefined;
}

/** One clientRequestId per dialog and one upload per file, so a lost reply never pays twice. */
export function usePayTeacher(teacherId: string, onSaved: (replayed: boolean) => void) {
  const queryClient = useQueryClient();
  const scope: Scope = { kind: 'admin', teacherId };
  const [requestId] = useState(() => crypto.randomUUID());
  const [receiptOnce] = useState(() => uploadOnce<File>());

  const receiptPath = (file: File | null): Promise<string | null> =>
    file
      ? receiptOnce(file, () => uploadTeacherReceipt({ teacherId, file }))
      : Promise.resolve(null);

  return useMutation({
    mutationFn: async ({ form, file, earningIds }: PayInput) => {
      const amount = parseAmount(form.amount);
      if (amount === null) throw new Error('amount');
      return payTeacher(teacherId, {
        amount,
        method: manualMethod.parse(form.method),
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

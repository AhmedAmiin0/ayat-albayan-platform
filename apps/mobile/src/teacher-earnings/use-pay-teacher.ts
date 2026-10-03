import type { PaymentMethod, TeacherPaymentView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/lib/api';
import { requestId } from '@/lib/request-id';
import { earningsKey } from './queries';

export interface PayInput {
  amount: number;
  method: PaymentMethod;
  note?: string;
  /** The ticked sessions; omitted = every open session. */
  earningIds?: string[];
}

interface Attempt {
  key: string;
  clientRequestId: string;
  paidAt: string;
}

/**
 * «سجّل دفعة» for a teacher (rule 8): made once per pay form, the clientRequestId and the
 * paid-at are re-sent on every retry of the same payment, so a lost reply never records the money
 * twice. A different amount/method/note/selection is a different payment: it gets a new id. A
 * recorded payment ends the attempt. Receipts are not asked on mobile (receiptPath omitted).
 */
export function usePayTeacher(base: string) {
  const client = useQueryClient();
  const attempt = useRef<Attempt | null>(null);
  return useMutation({
    mutationKey: [...earningsKey(base), 'pay'],
    mutationFn: (input: PayInput) => {
      const key = JSON.stringify(input);
      if (attempt.current?.key !== key) {
        attempt.current = { key, clientRequestId: requestId(), paidAt: new Date().toISOString() };
      }
      const { clientRequestId, paidAt } = attempt.current;
      return apiSend<TeacherPaymentView>('POST', `${base}/earnings/payments`, { ...input, paidAt, clientRequestId });
    },
    onSuccess: () => {
      attempt.current = null;
    },
    onSettled: () => client.invalidateQueries({ queryKey: earningsKey(base) }),
  });
}

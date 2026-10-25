import type { TeacherPaymentResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import type { PayInput } from './pay-draft';
import { uploadTeacherReceipt } from './upload-receipt';

/**
 * «سجّل دفعة» for a teacher: the receipt goes up first (once, a retry after a failed POST does not
 * upload it again), then the payment with this form's clientRequestId, re-sent until the API
 * answers: a retry after a lost reply returns the payment already recorded (rule 8).
 */
export function usePayTeacher(teacherId: string) {
  const client = useQueryClient();
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  const request = useRef<string | null>(null);

  async function receiptPath(input: PayInput): Promise<string | null> {
    if (!input.receipt) return null;
    if (uploaded.current?.uri !== input.receipt.uri) {
      uploaded.current = { uri: input.receipt.uri, path: await uploadTeacherReceipt(teacherId, input.receipt) };
    }
    return uploaded.current.path;
  }

  return useMutation({
    mutationKey: ['teacher-earnings', teacherId, 'pay'],
    mutationFn: async (input: PayInput) => {
      const receiptPathValue = await receiptPath(input);
      request.current ??= requestId();
      return apiSend<TeacherPaymentResult>('POST', `/teacher-earnings/${teacherId}/payments`, {
        clientRequestId: request.current,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
        ...(input.earningIds ? { earningIds: input.earningIds } : {}),
        ...(receiptPathValue ? { receiptPath: receiptPathValue } : {}),
      });
    },
    onSuccess: () => {
      request.current = null;
    },
    onSettled: () => void client.invalidateQueries({ queryKey: ['teacher-earnings', teacherId] }),
  });
}

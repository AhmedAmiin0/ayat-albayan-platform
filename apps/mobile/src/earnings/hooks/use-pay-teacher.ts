import { pendingRequestId, uploadOnce } from '@ab/client-core';
import type { TeacherPaymentResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import type { PayInput } from '../lib/pay-draft';
import { uploadTeacherReceipt } from './upload-receipt';

/**
 * «سجّل دفعة» for a teacher: the receipt goes up first (once, a retry after a failed POST does not
 * upload it again), then the payment with this form's clientRequestId, re-sent until the API
 * answers: a retry after a lost reply returns the payment already recorded (rule 8).
 */
export function usePayTeacher(teacherId: string) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  const [request] = useState(() => pendingRequestId(requestId));

  async function receiptPath(input: PayInput): Promise<string | null> {
    const { receipt } = input;
    return receipt ? receiptOnce(receipt.uri, () => uploadTeacherReceipt(teacherId, receipt)) : null;
  }

  return useMutation({
    mutationKey: ['teacher-earnings', teacherId, 'pay'],
    mutationFn: async (input: PayInput) => {
      const receiptPathValue = await receiptPath(input);
      return apiSend<TeacherPaymentResult>('POST', `/teacher-earnings/${teacherId}/payments`, {
        clientRequestId: request.current(),
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt,
        ...(input.earningIds ? { earningIds: input.earningIds } : {}),
        ...(receiptPathValue ? { receiptPath: receiptPathValue } : {}),
      });
    },
    onSuccess: () => request.settle(),
    onSettled: () => void client.invalidateQueries({ queryKey: ['teacher-earnings', teacherId] }),
  });
}

import { pendingRequestId, uploadOnce } from '@ab/client-core';
import type { Page, PaymentView, StudentBalanceView } from '@ab/shared';
import { useMutation, useQueryClient, type Query } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { useAttachmentPaths } from '@/payments/receipts/attachments';
import {
  pendingPayment,
  withPaid,
  withPayment,
  type PaymentInput,
} from '@/payments/lib/optimistic';
import { balanceKey } from './queries';
import { uploadReceipt } from '@/core/lib/receipts/upload-receipt';

/** Cached GET /payments lists of this student (their params carry its studentId). */
function studentLists(studentId: string) {
  return {
    queryKey: ['payments', 'list'],
    predicate: (q: Query) => {
      const params = q.queryKey[2];
      return typeof params === 'object' && params !== null && 'studentId' in params
        ? params.studentId === studentId
        : false;
    },
  };
}

/** R-MOB-03 optimistic; one upload and one clientRequestId per payment so retries never double. */
export function useRecordPayment(studentId: string) {
  const client = useQueryClient();
  const [receiptOnce] = useState(() => uploadOnce<string>());
  const [request] = useState(() => pendingRequestId(requestId));
  const attachmentPaths = useAttachmentPaths(uploadReceipt);

  async function receiptPath(input: PaymentInput): Promise<string | undefined> {
    if (!input.receipt) return undefined;
    const { receipt } = input;
    return receiptOnce(`${input.subscriptionId} ${receipt.uri}`, () => uploadReceipt(input.subscriptionId, receipt));
  }

  return useMutation({
    mutationKey: ['payments', 'record', studentId],
    mutationFn: async (input: PaymentInput) => {
      const path = await receiptPath(input);
      const attachments = await attachmentPaths(input.subscriptionId, input.attachments ?? []);
      return apiSend<PaymentView>('POST', '/payments', {
        clientRequestId: request.current(),
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        paidAt: input.paidAt,
        ...(path === undefined ? {} : { receiptPath: path }),
        ...(attachments.length ? { attachments } : {}),
      });
    },
    onMutate: async (input) => {
      const lists = studentLists(studentId);
      const balance = { queryKey: balanceKey(studentId) };
      await Promise.all([client.cancelQueries(lists), client.cancelQueries(balance)]);
      const snapshot = [...client.getQueriesData(lists), ...client.getQueriesData(balance)];
      const row = pendingPayment(input);
      client.setQueriesData<Page<PaymentView>>(lists, (page) => withPayment(page, row));
      client.setQueryData<StudentBalanceView>(balance.queryKey, (b) => withPaid(b, input));
      return { snapshot };
    },
    onSuccess: () => {
      request.settle();
    },
    onError: (_error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    // Not awaited: the form closes as soon as the API answers; the pending row stands until then.
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['payments'] });
      void client.invalidateQueries({ queryKey: ['students', studentId] });
    },
  });
}

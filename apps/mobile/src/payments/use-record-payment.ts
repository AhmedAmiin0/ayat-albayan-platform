import type { PaymentView, StudentBalanceView } from '@ab/shared';
import { useMutation, useQueryClient, type Query } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/core/lib/http/api';
import type { Page } from '@/core/lib/query/paging';
import { requestId } from '@/core/lib/http/request-id';
import { useAttachmentPaths } from './attachments';
import { pendingPayment, withPaid, withPayment, type PaymentInput } from './optimistic';
import { balanceKey } from './queries';
import { uploadReceipt } from './upload-receipt';

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

/**
 * «سجّل دفعة» (R-PAY-01, R-MOB-02): the receipt or a bank transfer's attachments go up first (signed
 * URLs), then POST /payments.
 * Optimistic (R-MOB-03): the student's payments lists show the row and the package its new `paid`
 * at once; a failure puts the snapshot back; either way both refetch. A receipt that went up is
 * remembered, so retrying after a failed POST does not upload it again; and the form's
 * clientRequestId is re-sent until a payment is recorded, so a retry after a lost reply returns the
 * payment the API already has instead of recording the money twice (rule 8).
 */
export function useRecordPayment(studentId: string) {
  const client = useQueryClient();
  const uploaded = useRef<{ key: string; path: string } | null>(null);
  const request = useRef<string | null>(null);
  const attachmentPaths = useAttachmentPaths(uploadReceipt);

  async function receiptPath(input: PaymentInput): Promise<string | undefined> {
    if (!input.receipt) return undefined;
    const key = `${input.subscriptionId} ${input.receipt.uri}`;
    if (uploaded.current?.key !== key) {
      uploaded.current = { key, path: await uploadReceipt(input.subscriptionId, input.receipt) };
    }
    return uploaded.current.path;
  }

  return useMutation({
    mutationKey: ['payments', 'record', studentId],
    mutationFn: async (input: PaymentInput) => {
      const path = await receiptPath(input);
      const attachments = await attachmentPaths(input.subscriptionId, input.attachments ?? []);
      request.current ??= requestId();
      return apiSend<PaymentView>('POST', '/payments', {
        clientRequestId: request.current,
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
      request.current = null;
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

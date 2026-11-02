import type { SalesChatReceipt, SalesChatReceiptFile, SalesReceiptCopied } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';

// The receipts the family already sent in its WhatsApp chat (R-ASST-04): their list, a short-lived
// thumbnail per image (fetched only when its row is on screen) and the copy into receipts/. `bind`: the
// chat's phone for a child not hers (chatBinding, sales.renew_any); nothing for hers.
type Bind = { phone?: string };

const scopeQuery = (studentId: string, bind: Bind) =>
  `studentId=${encodeURIComponent(studentId)}${bind.phone ? `&phone=${encodeURIComponent(bind.phone)}` : ''}`;

export function useChatReceipts(studentId: string, enabled: boolean, bind: Bind = {}) {
  return useQuery({
    queryKey: ['sales', 'money', 'chat-receipts', studentId],
    queryFn: () => apiFetch<SalesChatReceipt[]>(`/sales/money/chat-receipts?${scopeQuery(studentId, bind)}`),
    enabled: enabled && studentId !== '',
  });
}

/** An image's signed URL; none for a PDF or an expired file. Fresh for a minute (the URL is short-lived). */
export function useChatReceiptThumb(studentId: string, item: SalesChatReceipt, bind: Bind = {}) {
  const wanted = !item.expired && item.mime.startsWith('image/');
  return useQuery({
    queryKey: ['sales', 'money', 'chat-receipts', studentId, item.message_id],
    queryFn: () =>
      apiFetch<SalesChatReceiptFile>(
        `/sales/money/chat-receipts/${encodeURIComponent(item.message_id)}?${scopeQuery(studentId, bind)}`,
      ),
    enabled: wanted,
    staleTime: 60_000,
  });
}

interface ChatCopyInput extends Bind {
  subscriptionId: string;
  messageId: string;
}

/** POST /sales/payments/receipt-from-chat: the chosen file copied under the package; its path. */
export function useCopyChatReceipt() {
  return useMutation({
    mutationKey: ['sales', 'payments', 'receipt-from-chat'],
    mutationFn: (input: ChatCopyInput) =>
      apiSend<SalesReceiptCopied>('POST', '/sales/payments/receipt-from-chat', input),
  });
}

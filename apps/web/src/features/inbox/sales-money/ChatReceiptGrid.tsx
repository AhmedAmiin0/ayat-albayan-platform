import type { SalesChatReceipt } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { chatReceiptsQuery, receiptFromChat } from './api';
import { ChatReceiptThumb } from './ChatReceiptThumb';
import { salesErrorText } from './errors';
import { chatReceiptLabel, type ReceiptChoice } from './receipt';

type Props = {
  sub: { id: string; student: { id: string } };
  /** Messages already in the list: shown as picked, never copied again. */
  picked: ReadonlySet<string>;
  onPicked: (choice: ReceiptChoice & { kind: 'chat' }) => void;
};

/**
 * «اختر صورة الإيصال من المحادثة»: the family's images / PDFs (newest first, as the API sends them);
 * an expired one is disabled. Picking copies it into the package's receipts (receipt-from-chat).
 */
export function ChatReceiptGrid({ sub, picked, onPicked }: Props) {
  const list = useQuery(chatReceiptsQuery(sub.student.id));
  const copy = useMutation({
    mutationFn: (r: SalesChatReceipt) => receiptFromChat({ subscriptionId: sub.id, messageId: r.message_id }),
    onSuccess: (res, r) =>
      onPicked({ kind: 'chat', messageId: r.message_id, subscriptionId: sub.id, path: res.receipt_path, label: chatReceiptLabel(r) }),
  });

  if (list.isPending) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  if (list.isError) return <FormAlert>{salesErrorText(list.error)}</FormAlert>;
  if (list.data.length === 0) return <p className="text-sm text-ink-2">{t.salesMoney.noChatReceipts}</p>;
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.data.map((r) => (
          <li key={r.message_id}>
            <button
              type="button"
              aria-label={chatReceiptLabel(r)}
              aria-pressed={picked.has(r.message_id)}
              disabled={r.expired || copy.isPending}
              onClick={() => (picked.has(r.message_id) ? undefined : copy.mutate(r))}
              className={cn(
                'grid w-full gap-1 rounded-sm border border-rule p-1 text-start',
                r.expired ? 'cursor-not-allowed opacity-50' : 'hover:border-(--lapis)',
                picked.has(r.message_id) && 'border-(--lapis)',
              )}
            >
              <ChatReceiptThumb studentId={sub.student.id} receipt={r} />
              {r.expired && <span className="text-2xs text-ink-3">{t.salesMoney.receiptExpired}</span>}
            </button>
          </li>
        ))}
      </ul>
      {copy.isError && <FormAlert>{salesErrorText(copy.error)}</FormAlert>}
    </div>
  );
}

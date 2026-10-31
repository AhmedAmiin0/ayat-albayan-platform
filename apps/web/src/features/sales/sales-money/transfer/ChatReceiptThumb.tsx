import type { SalesChatReceipt } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { chatReceiptFileQuery, type Bind } from '@/features/sales/sales-money/api';

type Props = { studentId: string; receipt: SalesChatReceipt; bind?: Bind | undefined };

/**
 * One chat file's thumbnail: an image asks for its short-lived signed URL only when shown (one request
 * per item, GET /sales/money/chat-receipts/:messageId); a PDF or an expired file shows its kind only.
 */
export function ChatReceiptThumb({ studentId, receipt, bind }: Props) {
  const image = receipt.mime.startsWith('image/') && !receipt.expired;
  const file = useQuery({ ...chatReceiptFileQuery(studentId, receipt.message_id, bind), enabled: image });
  if (image && file.data) {
    return <img src={file.data.url} alt="" className="h-24 w-full rounded-sm object-cover" loading="lazy" />;
  }
  return (
    <span className="grid h-24 w-full place-items-center rounded-sm bg-sunk text-xs font-semibold text-ink-3" dir="ltr">
      {receipt.mime === 'application/pdf' ? 'PDF' : receipt.mime.split('/')[1]?.toUpperCase()}
    </span>
  );
}

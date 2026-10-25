import type { SalesChatReceipt } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ChatReceiptRow } from './ChatReceiptRow';
import { useChatReceipts } from './chat-receipts';

export interface ChatReceiptListProps {
  studentId: string;
  /** The message being copied, if any. */
  busyId: string | undefined;
  onPick: (item: SalesChatReceipt) => void;
}

/** The family's recent images and PDFs (GET /sales/money/chat-receipts), newest as the API sends them. */
export function ChatReceiptList({ studentId, busyId, onPick }: ChatReceiptListProps) {
  const list = useChatReceipts(studentId, true);
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />;
  if (!list.data) return <Note>{t.common.loading}</Note>;
  if (list.data.length === 0) return <Note>{t.salesMoney.noChatReceipts}</Note>;
  return (
    <View style={{ gap: 4 }}>
      {list.data.map((item) => (
        <ChatReceiptRow
          key={item.message_id}
          studentId={studentId}
          item={item}
          busy={busyId === item.message_id}
          onPick={onPick}
        />
      ))}
    </View>
  );
}

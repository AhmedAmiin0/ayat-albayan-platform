import type { SalesChatReceipt } from '@ab/shared';
import { View } from 'react-native';
import { t, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { ChatReceiptRow } from './ChatReceiptRow';
import { useChatReceipts } from './chat-receipts';

interface ChatReceiptListProps {
  studentId: string;
  /** The chat's phone for a child not hers (chatBinding). */
  bind?: { phone?: string };
  /** The message being copied, if any. */
  busyId: string | undefined;
  onPick: (item: SalesChatReceipt) => void;
}

/** The family's recent images and PDFs (GET /sales/money/chat-receipts), in the API's order. */
export function ChatReceiptList({ studentId, bind, busyId, onPick }: ChatReceiptListProps) {
  const list = useChatReceipts(studentId, true, bind);
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />;
  if (!list.data) return <Note>{t.common.loading}</Note>;
  if (list.data.length === 0) return <Note>{t.salesMoney.noChatReceipts}</Note>;
  return (
    <View style={{ gap: 4 }}>
      {list.data.map((item) => (
        <ChatReceiptRow
          key={item.message_id}
          studentId={studentId}
          {...(bind ? { bind } : {})}
          item={item}
          busy={busyId === item.message_id}
          onPick={onPick}
        />
      ))}
    </View>
  );
}

import type { NotificationEntryView } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { stateChip } from '@/features/messaging/notification-catalogue/catalogue-text';
import { reasonText } from '@/features/messaging/notification-rules/rule-text';

/** «هل يُرسل الآن؟»: the state in one word and the reason in a line («لأن إرسال الرسائل متوقف»). */
export function StatePart({ entry }: { entry: NotificationEntryView }) {
  const reason = reasonText(entry);
  return (
    <span className="grid justify-items-start gap-1">
      <StatusChip {...stateChip(entry)} size="sm" />
      {reason && <span className="text-xs text-ink-2">{reason}</span>}
    </span>
  );
}

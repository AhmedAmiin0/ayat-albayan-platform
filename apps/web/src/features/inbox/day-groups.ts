import { intlLocale, type MessageView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

// Date separators in the chat log (phones, owner 2026-10-05): «اليوم», «أمس», else the date.
// Days are the viewer's local days, like every time on the page.

const dayDate = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' });

export type LogItem = { kind: 'day'; key: string; label: string } | { kind: 'message'; message: MessageView };

const dayKey = (at: Date): string => at.toDateString();

/** «اليوم» / «أمس» / «الخميس 1 أكتوبر». */
export function dayLabel(at: Date, now: Date): string {
  if (dayKey(at) === dayKey(now)) return t.inbox.dayToday;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(at) === dayKey(yesterday)) return t.inbox.dayYesterday;
  return dayDate.format(at);
}

/** The messages (oldest → newest) with a separator before the first message of each day. */
export function withDays(messages: readonly MessageView[], now: Date): LogItem[] {
  const items: LogItem[] = [];
  let last = '';
  for (const message of messages) {
    const at = new Date(message.created_at);
    const key = dayKey(at);
    if (key !== last) items.push({ kind: 'day', key, label: dayLabel(at, now) });
    items.push({ kind: 'message', message });
    last = key;
  }
  return items;
}

import {
  calendarDaysBetween,
  chatDayKey,
  dateText,
  mergeChat,
  type CallView,
  type MessageView,
} from '@ab/shared';
import { viewerZone } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// Date separators in the chat log (phones, owner 2026-10-05): «اليوم», «أمس», else the date.
// Days are the viewer's local days, like every time on the page.

const DAY_DATE = { weekday: 'long', day: 'numeric', month: 'long' } as const;

export type LogItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; message: MessageView }
  | { kind: 'call'; call: CallView };

/** «2026-10-01»: the viewer's local day (the browser's zone). */
const dayKey = (at: Date): string => chatDayKey(at, viewerZone());

/** «اليوم» / «أمس» / «الخميس 1 أكتوبر». */
export function dayLabel(at: Date, now: Date): string {
  const ago = calendarDaysBetween(dayKey(at), dayKey(now));
  if (ago === 0) return t.inbox.dayToday;
  if (ago === 1) return t.inbox.dayYesterday;
  return dateText(at, { tz: viewerZone(), locale }, DAY_DATE);
}

/**
 * The messages (oldest → newest) and the chat's calls (docs/28), merged by time, with a separator
 * before the first entry of each day. `from`: calls before the oldest loaded page wait for it.
 */
export function withDays(messages: readonly MessageView[], now: Date, calls?: { list: readonly CallView[]; from: string | null }): LogItem[] {
  const items: LogItem[] = [];
  let last = '';
  for (const entry of mergeChat(messages, calls?.list ?? [], { from: calls?.from ?? null })) {
    const at = new Date(entry.at);
    const key = dayKey(at);
    if (key !== last) items.push({ kind: 'day', key, label: dayLabel(at, now) });
    items.push(entry.kind === 'message' ? { kind: 'message', message: entry.message } : { kind: 'call', call: entry.call });
    last = key;
  }
  return items;
}

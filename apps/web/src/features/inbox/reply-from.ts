import type { ThreadView } from '@ab/shared';
import { t } from '@/lib/i18n';

/**
 * «سيصل ردّك عبر خط المحادثات» (docs/12 §13.10): the line a session reply leaves from, i.e. the
 * line of the newest inbound. Only inside the 24 h window and only when that line is known.
 */
export function replyFromText(thread: ThreadView): string | null {
  const line = thread.last_inbound_line;
  if (!thread.session_open || !line) return null;
  return t.inbox.line.replyFrom.replace('{line}', t.enums.waLine[line]);
}

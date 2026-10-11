import type { ThreadView } from '@ab/shared';
import { t } from '@/lib/i18n';

/**
 * «سيصل ردّك عبر خط المحادثات» (docs/12 §13.10): the line a session reply leaves from, i.e. the
 * server's reply_line (the chat line whenever its window is open, §13.3). Only inside the 24 h
 * window and only when that line is known (null on a single line or in an old cache).
 */
export function replyFromText(thread: ThreadView): string | null {
  const line = thread.reply_line;
  if (!thread.session_open || !line) return null;
  return t.inbox.line.replyFrom.replace('{line}', t.enums.waLine[line]);
}

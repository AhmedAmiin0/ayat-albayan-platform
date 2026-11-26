import type { ThreadView } from '@ab/shared';
import { t } from '@ab/web-kit';

/** docs/12 §13.10: session replies leave from reply_line; templates use their own registry line. */
export function replyFromText(thread: ThreadView): string | null {
  const line = thread.reply_line;
  if (!thread.session_open || !line) return null;
  return t.inbox.line.replyFrom.replace('{line}', t.enums.waLine[line]);
}

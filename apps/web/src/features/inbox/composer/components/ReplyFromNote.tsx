import type { ThreadView } from '@ab/shared';
import { replyFromText } from '../lib/reply-from';

/** The reply-from note beside the window's end in the composer (nothing when not applicable). */
export function ReplyFromNote({ thread }: { thread: ThreadView }) {
  const text = replyFromText(thread);
  if (!text) return null;
  return <p className="text-xs text-ink-3">{text}</p>;
}

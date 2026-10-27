import type { ThreadView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { lineWord } from '../../shared/line-words';
import { useNoteStyle } from '../../shared/note-style';

/**
 * Inside the 24 h window, which line the reply leaves from: the server's reply_line, the chat line
 * whenever its window is open (docs/12 §13.3, §13.10). Nothing when the window is closed or the
 * thread has no reply line (a single line, an old cache).
 * Names the line only, never its number. Never cut (owner 2026-10-27): a long name wraps.
 */
export function LineNote({ thread, open }: { thread: ThreadView | null; open: boolean }) {
  const note = useNoteStyle();
  const line = thread?.reply_line;
  if (!open || !line) return null;
  const text = t.inbox.line.replyFrom.replace('{line}', lineWord(line));
  return (
    <AppText testID="line-note" accessibilityLabel={text} style={{ ...note, flexShrink: 1 }}>
      {text}
    </AppText>
  );
}

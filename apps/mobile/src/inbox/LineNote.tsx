import type { ThreadView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { lineWord } from './line-words';

/**
 * Inside the 24 h window, which line the reply leaves from: the line of their newest message
 * (docs/12 §13.10). Nothing when the window is closed or the thread has no line (a single line).
 * Names the line only, never its number.
 */
export function LineNote({ thread, open }: { thread: ThreadView | null; open: boolean }) {
  const { color } = useTheme();
  const line = thread?.last_inbound_line;
  if (!open || !line) return null;
  return (
    <AppText
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink2,
      }}
    >
      {t.inbox.line.replyFrom.replace('{line}', lineWord(line))}
    </AppText>
  );
}

import type { ThreadView } from '@ab/shared';
import { View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { LineNote } from '../thread/components/LineNote';
import { sessionUntil } from '../messages/hooks/message-text';
import { useNoteStyle } from '../shared/note-style';

/**
 * Over an open reply box, in 2xs: which line the reply leaves from (LineNote) and until when free
 * text is allowed. Neither is ever cut (owner 2026-10-27): side by side when they fit, else the
 * window's end moves under the line's name, and a long name wraps. Nothing when neither applies.
 */
export function ComposerNotes({ thread, open }: { thread: ThreadView | null; open: boolean }) {
  const note = useNoteStyle();
  const lastInbound = thread?.last_inbound_at ?? null;
  if (!open || (!lastInbound && !thread?.reply_line)) return null;
  const until = lastInbound ? sessionUntil(lastInbound) : null;
  return (
    <View testID="composer-notes" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, paddingHorizontal: 4 }}>
      <LineNote thread={thread} open={open} />
      {until ? (
        <AppText
          testID="session-until"
          accessibilityLabel={until}
          style={{ ...note, flexShrink: 0 }}
        >
          {until}
        </AppText>
      ) : null}
    </View>
  );
}

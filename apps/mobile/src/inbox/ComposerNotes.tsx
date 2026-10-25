import type { ThreadView } from '@ab/shared';
import { View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { LineNote } from './LineNote';
import { sessionUntil } from './message-text';
import { useNoteStyle } from './note-style';

/**
 * Over an open reply box, in one 2xs row: which line the reply leaves from (LineNote) and until when
 * free text is allowed. The window's end is never cut (its time is the point); only the line's name
 * gives way, with an ellipsis. Nothing when neither applies.
 */
export function ComposerNotes({ thread, open }: { thread: ThreadView | null; open: boolean }) {
  const note = useNoteStyle();
  const lastInbound = thread?.last_inbound_at ?? null;
  if (!open || (!lastInbound && !thread?.reply_line)) return null;
  const until = lastInbound ? sessionUntil(lastInbound) : null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
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

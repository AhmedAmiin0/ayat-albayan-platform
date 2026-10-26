import { AppText } from '@/core/ui/primitives/AppText';
import { useNoteStyle } from '../shared/note-style';
import { reopenNote, useThreadReopen } from './use-thread-reopen';

/** Over the closed chat's composer: the reopen request went (or went earlier today). Nothing otherwise. */
export function ReopenNote({ phone, closed }: { phone: string; closed: boolean }) {
  const note = useNoteStyle();
  const text = reopenNote(useThreadReopen(phone, closed));
  if (!text) return null;
  return (
    <AppText testID="reopen-note" accessibilityRole="text" accessibilityLiveRegion="polite" style={{ ...note, paddingHorizontal: 4 }}>
      {text}
    </AppText>
  );
}

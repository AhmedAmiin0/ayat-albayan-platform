import { View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { fileError } from '@/inbox/composer/send-file';
import type { SharedFile } from '@/inbox/thread/share/read-share';
import { type FailedShare, sendingText, type ShareStep } from '@/inbox/thread/share/use-share-send';

const s = t.inbox.share;

/** The name staff know the file by: the sender's, else the one it is sent with. */
const fileLabel = (f: SharedFile): string => f.name || `photo-${String(f.n)}.jpg`;

interface ShareFailuresProps {
  failed: readonly FailedShare[];
  step: ShareStep | null;
  actions: { retry: () => void; open: () => void };
}

export function ShareFailures({ failed, step, actions }: ShareFailuresProps) {
  const busy = step !== null;
  const retryLabel = step ? sendingText(step) : s.retry;
  return (
    <View style={{ gap: 8 }}>
      <Note alert>{s.someFailed}</Note>
      {failed.map(({ item, error }) => (
        <ErrorLine key={item.id} message={`${fileLabel(item)}: ${fileError(error)}`} />
      ))}
      <Button label={retryLabel} busy={busy} onPress={actions.retry} />
      <Button variant="secondary" label={s.openChat} disabled={busy} onPress={actions.open} />
    </View>
  );
}

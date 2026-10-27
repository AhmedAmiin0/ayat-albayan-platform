import type { MessageView } from '@ab/shared';
import { View } from 'react-native';
import { DownloadLink } from '../copy-download/DownloadLink';
import { MediaNote, problemText, RetryLine } from '../photo/MediaNote';
import { ensureAudioMode } from './playback';
import { useFileOnTap } from './use-file-on-tap';
import { VoicePlayback } from './VoicePlayback';
import { VoiceRow } from './VoiceRow';

interface VoiceNoteProps {
  message: MessageView;
  phone: string;
  kind: string;
  /** The bubble's menu, as a long press on the play button. */
  onLongPress?: () => void;
}

/**
 * A voice note as WhatsApp shows it (owner 2026-10-27): the round play button, the waveform and its
 * length; ONE tap fetches it (W6: never before) and plays it once loaded. Expired, the old number's or
 * a teacher's stay a note; a failed fetch keeps the row, «اضغط لإعادة المحاولة». «تنزيل» under it.
 */
export function VoiceNote({ message: m, phone, kind, onLongPress }: VoiceNoteProps) {
  const { state, open, fail } = useFileOnTap(phone, m.id);
  const ended = state.step === 'problem' ? problemText(state.problem, kind) : null;
  if (ended) return <MediaNote text={ended} />;
  const tap = () => {
    void ensureAudioMode();
    open();
  };
  return (
    <View style={{ gap: 2 }}>
      {state.step === 'ready' ? (
        <VoicePlayback id={m.id} url={state.file.url} kind={kind} onFail={fail} onLongPress={onLongPress} />
      ) : (
        <VoiceRow id={m.id} kind={kind} playing={false} busy={state.step === 'fetching'} progress={0} clock="" onToggle={tap} onSeek={tap} onLongPress={onLongPress} />
      )}
      {state.step === 'problem' ? <RetryLine onPress={tap} /> : null}
      <DownloadLink message={m} phone={phone} />
    </View>
  );
}

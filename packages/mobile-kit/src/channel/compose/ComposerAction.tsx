import { Pressable } from 'react-native';
import { RoundAction } from '../../chat-ui/composer/RoundAction';
import { t } from '../../lib/i18n/i18n';

interface ComposerActionProps {
  /** The microphone: no text yet and the app records. */
  mic: boolean;
  /** A voice note is being recorded: «أرسل» stops and sends it. */
  recording: boolean;
  canSend: boolean;
  onRecord: () => void;
  onStop: () => void;
  onSend: () => void;
}

/** The round button at the bar's end: the microphone, or «أرسل» (a text or the recording). */
export function ComposerAction(p: ComposerActionProps) {
  if (p.mic) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.studentChannel.media.record}
        onPress={p.onRecord}
      >
        <RoundAction mode="mic" />
      </Pressable>
    );
  }
  return (
    <RoundAction
      mode="send"
      disabled={!p.recording && !p.canSend}
      onSend={p.recording ? p.onStop : p.onSend}
    />
  );
}

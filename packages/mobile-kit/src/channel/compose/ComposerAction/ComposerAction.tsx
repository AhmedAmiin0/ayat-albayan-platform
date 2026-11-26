import { Pressable } from 'react-native';
import { RoundAction } from '../../../chat-ui/composer/RoundAction';
import { t } from '../../../lib/i18n/i18n';
import { shape } from '../../../theme';
import type { useComposer } from '../use-composer';
import type { useRecording } from '../use-recording';

interface ComposerActionProps {
  box: Pick<ReturnType<typeof useComposer>, 'hasText' | 'canSend' | 'submit'>;
  voice: Pick<ReturnType<typeof useRecording>, 'available' | 'on' | 'start' | 'stop'>;
}

/** The channel's circle (ChatX boards): 48pt. */
const SIZE = shape.control.comfort;

/** Sending while recording stops the recording and sends it. */
export function ComposerAction({ box, voice }: ComposerActionProps) {
  if (!box.hasText && voice.available && !voice.on) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.studentChannel.media.record}
        onPress={voice.start}
      >
        <RoundAction mode="mic" size={SIZE} />
      </Pressable>
    );
  }
  return (
    <RoundAction
      mode="send"
      size={SIZE}
      disabled={!voice.on && !box.canSend}
      onSend={voice.on ? voice.stop : box.submit}
    />
  );
}

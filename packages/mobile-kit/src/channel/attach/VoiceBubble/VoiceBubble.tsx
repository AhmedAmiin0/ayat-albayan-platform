import { VoiceRow } from '../../../chat-ui/voice/VoiceRow';
import { t } from '../../../lib/i18n/i18n';
import { useVoice } from '../use-voice';

interface VoiceBubbleProps {
  id: string;
  url: string;
  durationMs: number | null;
  /** The message's menu, as a long press on the play button. */
  onLongPress?: () => void;
}

/** A voice note (ChatXVoice): the kit's VoiceRow, played through the app's player. */
export function VoiceBubble({ id, url, durationMs, onLongPress }: VoiceBubbleProps) {
  const voice = useVoice({ url, durationMs });
  return (
    <VoiceRow
      id={id}
      kind={t.studentChannel.kinds.voice}
      playing={voice.playing}
      busy={false}
      progress={voice.progress}
      clock={voice.clock}
      onToggle={voice.toggle}
      onLongPress={onLongPress}
      onSeek={voice.seek}
    />
  );
}

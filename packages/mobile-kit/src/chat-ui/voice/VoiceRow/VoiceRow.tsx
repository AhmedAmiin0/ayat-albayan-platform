import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { shape } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { useSmallText } from '../../bubble/use-small-text';
import { VoiceButton } from '../VoiceButton';
import { VoiceSpeed } from '../VoiceSpeed';
import { type WaveSeek, Waveform } from '../Waveform';
import type { Rate } from '../voice-math';

export interface VoiceRowProps {
  /** Seeds the drawn waveform: the same note looks the same on every render. */
  id: string;
  kind: string;
  playing: boolean;
  busy: boolean;
  progress: number;
  /** The length, or the position while it plays; '' until known. */
  clock: string;
  onToggle: () => void;
  /** The bubble's menu (reply, forward), as a long press on the button. */
  onLongPress?: () => void;
  onSeek: (fraction: number) => void;
  seek?: WaveSeek;
  /** Once playback has started: the speed chip. */
  speed?: { rate: Rate; onPress: () => void };
}

const SIDE = {
  width: shape.control.touch,
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
} as const;

/** One voice note's row, the same before and after loading so the bubble never changes size. */
export function VoiceRow(p: VoiceRowProps) {
  const small = useSmallText();
  const label = p.playing ? t.inbox.pauseMedia : t.inbox.playMedia.replace('{kind}', p.kind);
  return (
    <View
      testID="audio-player"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 230 }}
    >
      <VoiceButton
        playing={p.playing}
        busy={p.busy}
        label={label}
        onPress={p.onToggle}
        onLongPress={p.onLongPress}
      />
      <Waveform
        seed={p.id}
        progress={p.progress}
        label={t.inbox.voicePosition}
        onSeek={p.onSeek}
        seek={p.seek}
      />
      {/*
        Fixed: «1.5×» appearing never moves the waveform; the chip's touch area stays inside it.
      */}
      <View style={SIDE}>
        <AppText style={small}>{p.clock}</AppText>
        {p.speed ? <VoiceSpeed {...p.speed} /> : null}
      </View>
    </View>
  );
}

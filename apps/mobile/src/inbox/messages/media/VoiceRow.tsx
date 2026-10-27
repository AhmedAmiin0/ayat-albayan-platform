import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSmall } from '../components/MessageMeta';
import { VoiceButton } from './VoiceButton';
import { type WaveSeek, Waveform } from './Waveform';
import { type Rate, rateLabel } from './voice-math';

interface VoiceRowProps {
  id: string;
  kind: string;
  playing: boolean;
  busy: boolean;
  progress: number;
  /** The length, or the position while it plays; '' until known. */
  clock: string;
  onToggle: () => void;
  onSeek: (fraction: number) => void;
  seek?: WaveSeek;
  /** Once playback has started: the speed chip. */
  speed?: { rate: Rate; onPress: () => void };
}

/** One voice note's row, the same before and after loading so the bubble never changes size. */
export function VoiceRow(p: VoiceRowProps) {
  const { color } = useTheme();
  const small = useSmall();
  const label = p.playing ? t.inbox.pauseMedia : t.inbox.playMedia.replace('{kind}', p.kind);
  return (
    <View testID="audio-player" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 230 }}>
      <VoiceButton playing={p.playing} busy={p.busy} label={label} onPress={p.onToggle} />
      <Waveform seed={p.id} progress={p.progress} label={t.inbox.voicePosition} onSeek={p.onSeek} seek={p.seek} />
      <View style={{ minWidth: 36, alignItems: 'center', gap: 2 }}>
        <AppText style={small}>{p.clock}</AppText>
        {p.speed ? (
          <Pressable
            testID="voice-speed"
            accessibilityRole="button"
            accessibilityLabel={t.inbox.playbackSpeed.replace('{rate}', rateLabel(p.speed.rate))}
            onPress={p.speed.onPress}
            hitSlop={14}
            style={{ paddingHorizontal: 6, borderRadius: shape.radius.pill, backgroundColor: color.lapisWash }}
          >
            <AppText style={{ ...small, fontFamily: type.ui[600], color: color.lapis }}>{rateLabel(p.speed.rate)}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

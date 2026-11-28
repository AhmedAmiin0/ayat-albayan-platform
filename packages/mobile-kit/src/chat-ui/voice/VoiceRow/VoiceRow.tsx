import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui/primitives/AppText';
import { VoiceButton } from '../VoiceButton';
import { VoiceSpeed } from '../VoiceSpeed';
import { Waveform } from '../Waveform';
import type { VoiceRowProps } from './VoiceRow.types';
import { SIDE } from './voice-row.helpers';
import { useVoiceRow } from './use-voice-row';

/** One voice note's row, the same before and after loading so the bubble never changes size. */
export function VoiceRow(p: VoiceRowProps) {
  const { small, label } = useVoiceRow(p);
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

import { useState } from 'react';
import { Animated, View } from 'react-native';
import {
  t,
  shape,
  type,
  useTheme,
  AppText,
  Chevron,
  IconButton,
  Ltr,
  mediaTime,
  RecDot,
} from '@ab/mobile-kit';
import { TrashIcon } from '@/inbox/shared/chat-icons';
import { keptTake, meterLevel } from './voice-machine';
import type { VoiceUi } from './use-voice';

const BARS = 20;

/** About 20 level bars fed by the meter, filling from the start. */
function LevelBars({ level, ms }: { level: number | null; ms: number }) {
  const { color } = useTheme();
  const [bars, setBars] = useState<number[]>([]);
  const [seen, setSeen] = useState(ms);
  // One bar per meter reading (every 100 ms), kept while rendering: no effect, no extra pass.
  if (ms !== seen) {
    setSeen(ms);
    if (level !== null) setBars([...bars, meterLevel(level)].slice(-BARS));
  }
  return (
    <View testID="level-bars" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, overflow: 'hidden' }}>
      {bars.map((h, i) => (
        <View key={i} style={{ width: 3, height: 4 + h * 20, borderRadius: 2, backgroundColor: color.ink3 }} />
      ))}
    </View>
  );
}

export function RecordingBar({ voice }: { voice: Pick<VoiceUi, 'state' | 'ms' | 'level' | 'hint' | 'cancel'> }) {
  const { color } = useTheme();
  const kept = keptTake(voice.state);
  const ms = kept ? kept.ms : voice.ms;
  const time = (
    <Ltr testID="rec-time" style={{ fontFamily: type.ui[500], fontSize: type.size.base, color: color.ink }}>
      {mediaTime(ms / 1000)}
    </Ltr>
  );
  const row = { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: shape.control.touch } as const;
  if (voice.state.kind === 'holding' || voice.state.kind === 'arming') {
    return (
      <View testID="recording-bar" style={{ ...row, paddingHorizontal: 12 }}>
        <RecDot />
        {time}
        <Animated.View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: voice.hint }}>
          <Chevron to="prev" color={color.ink3} size={16} />
          <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink3 }}>{t.inbox.composer.voice.slideCancel}</AppText>
        </Animated.View>
      </View>
    );
  }
  return (
    <View testID="recording-bar" style={{ ...row, paddingEnd: 12 }}>
      <IconButton label={t.inbox.composer.voice.delete} disabled={voice.state.kind === 'sending'} onPress={() => void voice.cancel()}>
        <TrashIcon color={color.bad} />
      </IconButton>
      {voice.state.kind === 'locked' ? <RecDot /> : null}
      {time}
      <LevelBars level={voice.level} ms={voice.ms} />
    </View>
  );
}

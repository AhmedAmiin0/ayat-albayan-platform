import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { mediaTime } from '../../messages/hooks/media-time';
import { TrashIcon } from '../../shared/chat-icons';
import { keptTake, meterLevel } from './voice-machine';
import type { VoiceUi } from './use-voice';

const BARS = 20;

/** The red dot: blinks while recording (static with «Reduce Motion»); the timer and the announcement carry the state too. */
function RecDot() {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const [blink] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, blink]);
  return <Animated.View testID="rec-dot" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.bad, opacity: blink }} />;
}

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

/**
 * The pill's contents while a voice note is recorded or kept (owner 2026-10-27, as WhatsApp), in
 * reading order. Holding: [dot][time] … [‹ «اسحب للإلغاء»], the chevron pointing to the start.
 * Locked, kept or failed: [bin][dot while live][time][level]; the round button is «أرسل».
 */
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

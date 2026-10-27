import { useMemo, useRef, useState } from 'react';
import { type AccessibilityActionEvent, type GestureResponderEvent, I18nManager, View } from 'react-native';
import { shape, useTheme } from '@/theme';
import { touchFraction, waveBars } from './voice-math';

/** Once loaded: the screen reader's adjustable control (value in seconds, ±5 s). */
export interface WaveSeek {
  now: number;
  max: number;
  /** «0:13 / 1:05». */
  text: string;
  onStep: (delta: number) => void;
}

interface WaveformProps {
  seed: string;
  /** 0–1 played. */
  progress: number;
  label: string;
  /** A tap or the end of a drag (0–1 from the reading start); before loading it starts load + play. */
  onSeek: (fraction: number) => void;
  seek?: WaveSeek;
}

const HEIGHT = 28;
const DOT = 12;
const STEP_S = 5;
const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

/**
 * ~28 bars (voice-math waveBars), the played part in the brand colour, a dot at the position; fills
 * from the reading start (the right in Arabic). A drag moves the dot and seeks once, on release.
 */
export function Waveform({ seed, progress, label, onSeek, seek }: WaveformProps) {
  const { color } = useTheme();
  const bars = useMemo(() => waveBars(seed), [seed]);
  const width = useRef(0);
  const [held, setHeld] = useState<number | null>(null);
  const shown = held ?? progress;
  const at = (e: GestureResponderEvent) => touchFraction(e.nativeEvent.locationX, width.current, I18nManager.isRTL);
  const step = (e: AccessibilityActionEvent) => seek?.onStep(e.nativeEvent.actionName === 'increment' ? STEP_S : -STEP_S);
  const release = () => {
    if (held !== null) onSeek(held);
    setHeld(null);
  };
  return (
    <View
      testID="voice-wave"
      accessible={!!seek}
      importantForAccessibility={seek ? 'yes' : 'no-hide-descendants'}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={seek ? { min: 0, max: Math.round(seek.max), now: Math.round(seek.now), text: seek.text } : undefined}
      accessibilityActions={seek ? ACTIONS : undefined}
      onAccessibilityAction={step}
      onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // A drag along the bars is a seek, never the list's scroll or the bubble's swipe-to-reply.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => setHeld(at(e))}
      onResponderMove={(e) => setHeld(at(e))}
      onResponderRelease={release}
      onResponderTerminate={() => setHeld(null)}
      style={{ flex: 1, height: shape.control.touch, justifyContent: 'center' }}
    >
      <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', height: HEIGHT, gap: 2 }}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(3, h * HEIGHT),
              borderRadius: shape.radius.pill,
              backgroundColor: (i + 0.5) / bars.length <= shown ? color.lapis : color.ruleInput,
            }}
          />
        ))}
        <View
          testID="voice-dot"
          style={{
            position: 'absolute',
            start: `${shown * 100}%`,
            marginStart: -DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: color.lapis,
          }}
        />
      </View>
    </View>
  );
}

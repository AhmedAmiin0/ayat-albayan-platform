import { View } from 'react-native';
import { shape, useTheme } from '../../../theme';
import { waveBars } from '@ab/client-core';

const HEIGHT = 28;
const DOT = 12;

/** The bars and the position dot; `shown` 0–1 is played (or held under the finger). */
export function WaveBars({ seed, shown }: { seed: string; shown: number }) {
  const { color, name } = useTheme();
  // Light: the paler rule keeps played vs not readable (lapis vs ruleInput is only 1.4:1).
  const rest = name === 'light' ? color.ruleStrong : color.ruleInput;
  const bars = waveBars(seed);
  return (
    <View
      pointerEvents="none"
      style={{ flexDirection: 'row', alignItems: 'center', height: HEIGHT, gap: 2 }}
    >
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, h * HEIGHT),
            borderRadius: shape.radius.pill,
            backgroundColor: (i + 0.5) / bars.length <= shown ? color.lapis : rest,
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
  );
}

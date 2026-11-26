import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconLine } from '../../../chat-ui/icons/icon-line';
import { type Palette, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import type { StepState } from '@ab/client-core';

/** Each state's circle and ink: done green, current brand, pending sunk. */
const TONE: Readonly<Record<StepState, { fill: keyof Palette; ink: keyof Palette }>> = {
  done: { fill: 'okSoft', ink: 'ok' },
  current: { fill: 'lapisWash', ink: 'lapis' },
  pending: { fill: 'sunk', ink: 'ink3' },
};

const CHECK = 'm5 12.5 4.5 4.5L19 7';
const CLOCK = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2';

/** A step's 28pt circle: a check when done, a clock when current, its number while to come. */
export function StepMark({ state, n }: { state: StepState; n: number }) {
  const { color } = useTheme();
  const tone = TONE[state];
  const ink = color[tone.ink];
  const marks: Readonly<Record<StepState, () => ReactNode>> = {
    done: () => <IconLine color={ink} size={16} d={CHECK} />,
    current: () => <IconLine color={ink} size={16} d={CLOCK} />,
    pending: () => (
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.xs, color: ink }}>
        {String(n)}
      </AppText>
    ),
  };
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color[tone.fill],
      }}
    >
      {marks[state]()}
    </View>
  );
}

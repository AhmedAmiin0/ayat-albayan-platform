import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconLine } from '../../../chat-ui/icons/icon-line';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import type { StepState } from '@ab/client-core';
import type { StepMarkProps } from './StepMark.types';
import { TONE, CHECK, CLOCK } from './step-mark.helpers';

/** A step's 28pt circle: a check when done, a clock when current, its number while to come. */
export function StepMark({ state, n }: StepMarkProps) {
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

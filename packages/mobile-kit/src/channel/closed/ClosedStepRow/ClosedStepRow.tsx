import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import type { ClosedStep } from '@ab/client-core';
import { CurrentPill } from '../CurrentPill';
import { StepMark } from '../StepMark';

const noteOf = (step: ClosedStep): string => {
  const c = t.studentChannel.closedCard;
  return step.state === 'done' ? c.done : c.notes[step.key];
};

export function ClosedStepRow({ step, n }: { step: ClosedStep; n: number }) {
  const { color } = useTheme();
  const c = t.studentChannel.closedCard;
  const current = step.state === 'current';
  const note = noteOf(step);
  return (
    <View
      accessible
      accessibilityLabel={[c.steps[step.key], current ? c.current : '', note]
        .filter(Boolean)
        .join('، ')}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: color.rule,
      }}
    >
      <StepMark state={step.state} n={n} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText
            style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 24, color: color.ink }}
          >
            {c.steps[step.key]}
          </AppText>
          {current ? <CurrentPill /> : null}
        </View>
        {note ? (
          <AppText style={{ fontSize: type.size.xs, lineHeight: 20, color: color.ink2 }}>
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

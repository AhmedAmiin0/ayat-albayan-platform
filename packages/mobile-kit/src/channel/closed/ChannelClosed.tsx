import { closedReasonKey, closedSteps } from '@ab/client-core';
import type { ChannelClosedReason } from '@ab/shared';
import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { ClosedStepRow } from './ClosedStepRow';
import { DiamondOrnament } from './DiamondOrnament';

/**
 * A participant's closed chat (the ChatXClosed board): a raised card at the top
 * of the thread with the gold diamond, why it is not open yet, who talks here once it is, and the
 * steps left (the subscription, the teacher, then it opens by itself). The chat switched off for
 * the family says only that.
 */
export function ChannelClosed({ reason }: { reason: ChannelClosedReason | null }) {
  const { color } = useTheme();
  const key = closedReasonKey(reason);
  const steps = closedSteps(key);
  const c = t.studentChannel.closedCard;
  const title = steps.length > 0 ? c.title : t.studentChannel.closedReasons[key];
  return (
    <View
      testID="channel-closed"
      style={{
        alignItems: 'center',
        gap: 12,
        paddingTop: 24,
        paddingHorizontal: 16,
        paddingBottom: 4,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <DiamondOrnament />
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.h4,
          lineHeight: type.lineHeight(type.size.h4, true),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
      {steps.length > 0 ? (
        <AppText style={{ fontSize: 15, lineHeight: 24, color: color.ink2, textAlign: 'center' }}>
          {c.body}
        </AppText>
      ) : null}
      {steps.length > 0 ? (
        <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
          {steps.map((step, i) => (
            <ClosedStepRow key={step.key} step={step} n={i + 1} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

import type { ChannelClosedReason } from '@ab/shared';
import { View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { shape, type, useTheme } from '../theme';
import { AppText } from '../ui/primitives/AppText';

/** The closed line of each reason (studentChannel.closedReasons); none given → the general line. */
const LINE = (reason: ChannelClosedReason | null): string =>
  reason === null ? t.studentChannel.closed : t.studentChannel.closedReasons[reason];

/**
 * A participant's closed chat (owner 2026-10-29, the ChatXClosed board): a raised card in the
 * thread's place saying why it is not open yet and who talks here once it is.
 */
export function ChannelClosed({ reason }: { reason: ChannelClosedReason | null }) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}>
      <View
        testID="channel-closed"
        style={{
          gap: 8,
          padding: 20,
          borderRadius: shape.radius.lg,
          borderWidth: 1,
          borderColor: color.rule,
          backgroundColor: color.raised,
        }}
      >
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.ui[700],
            fontSize: type.size.lg,
            lineHeight: type.lineHeight(type.size.lg, true),
            color: color.ink,
            textAlign: 'center',
          }}
        >
          {LINE(reason)}
        </AppText>
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.ink2,
            textAlign: 'center',
          }}
        >
          {t.studentChannel.closedWho}
        </AppText>
      </View>
    </View>
  );
}

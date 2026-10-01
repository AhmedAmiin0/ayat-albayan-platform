import { Text, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { formatTimeOff } from './schedule';
import type { TimeOff } from './types';

/** One time-off: the span (device zone), and the reason when there is one. */
export function TimeOffRow({ off }: { off: TimeOff }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <Text
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatTimeOff(off)}
      </Text>
      {off.reason ? (
        <Text
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink2,
          }}
        >
          {`${t.availability.reason}: ${off.reason}`}
        </Text>
      ) : null}
    </View>
  );
}

import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { formatTimeOff } from '../schedule';
import type { TimeOff } from '../types';
import { AppText } from '@/core/ui/primitives/AppText';

/** One time-off: the span (device zone), and the reason when there is one. */
export function TimeOffRow({ off }: { off: TimeOff }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  return (
    <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 10 }}>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatTimeOff(off, cycle)}
      </AppText>
      {off.reason ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink2,
          }}
        >
          {`${t.availability.reason}: ${off.reason}`}
        </AppText>
      ) : null}
    </View>
  );
}

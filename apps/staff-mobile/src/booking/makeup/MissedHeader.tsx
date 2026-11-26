import { View } from 'react-native';
import { t, AppText, type, useTheme, whenText } from '@ab/mobile-kit';
import type { MakeupSource } from './makeup-draft';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

export function MissedHeader({ source }: { source: MakeupSource }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const line = { fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink };
  return (
    <View
      style={{
        gap: 2,
        marginBottom: 12,
        borderStartWidth: 3,
        borderStartColor: color.goldSoft,
        paddingStart: 10,
      }}
    >
      <AppText style={line}>
        {t.booking.mobile.makeupFor.replace('{name}', source.studentName)}
      </AppText>
      <AppText
        style={{ ...line, fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink2 }}
      >
        {`${t.booking.mobile.missedLesson}: ${whenText(source.missedAt, source.tz, viewer)}`}
      </AppText>
    </View>
  );
}

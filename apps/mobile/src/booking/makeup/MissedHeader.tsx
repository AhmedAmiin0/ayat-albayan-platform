import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { MakeupSource } from './makeup-draft';
import { whenText } from '../shared/slots';

/** What the makeup is for, over every step: «للطالب يوسف» and the lesson he missed, with its time. */
export function MissedHeader({ source }: { source: MakeupSource }) {
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
      <AppText style={line}>{t.booking.mobile.makeupFor.replace('{name}', source.studentName)}</AppText>
      <AppText style={{ ...line, fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink2 }}>
        {`${t.booking.mobile.missedLesson}: ${whenText(source.missedAt, source.tz)}`}
      </AppText>
    </View>
  );
}

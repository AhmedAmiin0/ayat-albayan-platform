import { formatRunningHead } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { BellButton } from '@/notifications/BellButton';
import { HeaderConnectingBar } from '@/core/ui/connecting/HeaderConnectingBar';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { hairline } from '../lib/surface';
import { greetingPart } from '../lib/today-plan';

interface TodayHeaderProps {
  now: Date;
  /** «آخر تحديث 16:20» while offline with the saved day on screen. */
  stale?: string;
}

/**
 * The calm header (docs/29 §1): the greeting by the Riyadh clock, «اليوم» 30/40, the date line without
 * the year, and the bell as a 44pt raised circle at the end side.
 */
export function TodayHeader({ now, stale }: TodayHeaderProps) {
  const { color } = useTheme();
  const date = formatRunningHead(now, locale).gregorian.split(' ').slice(0, -1).join(' ');
  const dateLine = t.today.dateLine.replace('{date}', date);
  const small = { fontFamily: type.ui[500], color: color.ink3, fontVariant: ['tabular-nums' as const] };
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ ...small, fontSize: type.size.sm, lineHeight: 22 }}>
            {t.today.greeting[greetingPart(now)]}
          </AppText>
          <AppText
            accessibilityRole="header"
            style={{ fontFamily: type.display, fontSize: 30, lineHeight: 40, color: color.ink }}
          >
            {t.today.title}
          </AppText>
          <AppText style={{ ...small, fontSize: type.size.xs, lineHeight: 20 }}>
            {stale ? `${dateLine} · ${stale}` : dateLine}
          </AppText>
        </View>
        <View style={{ borderRadius: 22, backgroundColor: color.raised, boxShadow: hairline(color.rule) }}>
          <BellButton tree="admin" round />
        </View>
      </View>
      <HeaderConnectingBar />
    </View>
  );
}

import { formatRunningHead } from '@ab/shared';
import { View } from 'react-native';
import { useHolds } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { BellButton } from '@/notifications/BellButton';
import { HeaderConnectingBar } from '@/core/ui/connecting/HeaderConnectingBar';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { hairline } from '@/core/ui/surface/surface';
import { useGreeting } from '../lib/use-greeting';

interface TodayHeaderProps {
  now: Date;
  /** Whose bell: the admin's always, the salesperson's only with notifications.push (as «المحادثات»). */
  tree: 'admin' | 'sales';
  /** «آخر تحديث 16:20» while offline with the saved day on screen. */
  stale?: string;
}

/**
 * The calm header (docs/29 §1): the greeting by the Riyadh clock (morning / afternoon / evening / night)
 * with the first name once the profile loads (owner 2026-10-28: «صباح الخير يا أحمد») is the header
 * line itself, in the display font at h4 (no «اليوم» title: the tab already says it, owner 2026-10-28),
 * the date line without the year under it, and the bell as a 44pt raised circle at the end side when
 * the tree shows one.
 */
export function TodayHeader({ now, tree, stale }: TodayHeaderProps) {
  const { color } = useTheme();
  const bell = useHolds('notifications.push') || tree === 'admin';
  const date = formatRunningHead(now, locale).gregorian.split(' ').slice(0, -1).join(' ');
  const dateLine = t.today.dateLine.replace('{date}', date);
  const greeting = useGreeting(now);
  const small = { fontFamily: type.ui[500], color: color.ink3, fontVariant: ['tabular-nums' as const] };
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{
              fontFamily: type.display,
              fontSize: type.size.h4,
              lineHeight: type.lineHeight(type.size.h4, true),
              color: color.ink,
            }}
          >
            {greeting}
          </AppText>
          <AppText style={{ ...small, fontSize: type.size.xs, lineHeight: 20 }}>
            {stale ? `${dateLine} · ${stale}` : dateLine}
          </AppText>
        </View>
        {bell ? (
          <View style={{ borderRadius: 22, backgroundColor: color.raised, boxShadow: hairline(color.rule) }}>
            <BellButton tree={tree} round />
          </View>
        ) : null}
      </View>
      <HeaderConnectingBar />
    </View>
  );
}

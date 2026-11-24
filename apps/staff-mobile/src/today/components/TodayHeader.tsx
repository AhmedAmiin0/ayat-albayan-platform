import { View } from 'react-native';
import {
  useHolds,
  t,
  HeaderConnectingBar,
  AppText,
  type,
  useTheme,
  hairline,
} from '@ab/mobile-kit';
import { BellButton } from '@/notifications/BellButton';
import { shortDate } from '@/today/lib/lesson-text';
import { useGreeting } from '@/today/lib/use-greeting';

interface TodayHeaderProps {
  now: Date;
  /** The salesperson's bell only with notifications.push. */
  tree: 'admin' | 'sales' | 'teacher';
  /** Shown while offline with the saved day on screen. */
  stale?: string | undefined;
  /** Replaces the Riyadh date line with the teacher's own (docs/48). */
  dateLine?: string;
}

/** The trees whose bell always shows; sales' only with notifications.push. */
const BELL_ALWAYS: Record<TodayHeaderProps['tree'], boolean> = {
  admin: true,
  teacher: true,
  sales: false,
};

/** Greeting by the Riyadh clock (docs/29 §1); no title, since the tab names the screen. */
export function TodayHeader({ now, tree, stale, dateLine: own }: TodayHeaderProps) {
  const { color } = useTheme();
  const bell = useHolds('notifications.push') || BELL_ALWAYS[tree];
  const dateLine = own ?? t.today.dateLine.replace('{date}', shortDate(now));
  const greeting = useGreeting(now);
  const small = {
    fontFamily: type.ui[500],
    color: color.ink3,
    fontVariant: ['tabular-nums' as const],
  };
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
          <View
            style={{
              borderRadius: 22,
              backgroundColor: color.raised,
              boxShadow: hairline(color.rule),
            }}
          >
            <BellButton tree={tree} round />
          </View>
        ) : null}
      </View>
      <HeaderConnectingBar />
    </View>
  );
}

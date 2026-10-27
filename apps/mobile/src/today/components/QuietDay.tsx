import { counted, RIYADH_TZ } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { riyadhTime } from '../lib/lesson-text';
import { raisedCard } from '../lib/surface';
import { localDate, visibleLessons } from '../lib/timeline';
import type { TodayLesson } from '../lib/today-lesson';
import type { TodaySource } from '../lib/today-source';

const DAY = 24 * 60 * 60_000; // Riyadh keeps no daylight saving: tomorrow is 24 h away.

/**
 * Nothing left today (docs/29 §6): a check in a lapis-wash circle, «انتهت حلقات اليوم», tomorrow's
 * count and first time once the tree's day query for tomorrow answers (no line while it loads or
 * fails), and «جدول الغد» to the tree's schedule tab on that day.
 */
export function QuietDay<L extends TodayLesson>({ now, source }: { now: Date; source: TodaySource<L> }) {
  const { color } = useTheme();
  const tomorrow = new Date(now.getTime() + DAY);
  const next = visibleLessons(source.useDay(tomorrow).data ?? []);
  const first = next[0];
  const date = localDate(tomorrow, RIYADH_TZ);
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lapisWash }}>
        <Svg width={36} height={36} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color.lapis} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: 20, lineHeight: 32, color: color.ink }}>
        {t.today.quietTitle}
      </AppText>
      {first ? (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: 24, color: color.ink3, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {t.today.tomorrowLine.replace('{count}', counted(t.today.count, next.length)).replace('{time}', riyadhTime(first.starts_at))}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate({ pathname: source.schedule, params: { date } })}
        style={({ pressed }) => ({
          ...raisedCard(color, 14),
          minHeight: 46,
          paddingHorizontal: 20,
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 22, color: color.ink }}>{t.today.tomorrowSchedule}</AppText>
      </Pressable>
    </View>
  );
}

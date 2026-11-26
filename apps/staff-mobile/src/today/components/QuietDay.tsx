import { counted } from '@ab/core';
import { addCalendarDays, addDaysIn, RIYADH_TZ } from '@ab/time';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, AppText, type, useTheme, raisedCard } from '@ab/mobile-kit';
import { lessonClock } from '@/today/lib/lesson-text';
import { localDate, visibleLessons } from '@/today/lib/timeline';
import type { TodayLesson } from '@/today/lib/today-lesson';
import type { TodaySource } from '@/today/lib/today-source';

/** Tomorrow's line shows only once its query answers (docs/29 §6), none while loading or failed. */
export function QuietDay<L extends TodayLesson>({
  now,
  source,
}: {
  now: Date;
  source: TodaySource<L>;
}) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  // academy day (docs/34 b): tomorrow on the Riyadh calendar (no daylight saving: 24 h on).
  const tomorrow = addDaysIn(now, 1, RIYADH_TZ);
  const next = visibleLessons(source.useDay(tomorrow).data ?? []);
  const first = next[0];
  // Calendar days, not now + 24 h: admin pages by viewer days, sales by Riyadh days (docs/34).
  const date = addCalendarDays(localDate(now, source.schedule === '/schedule' ? tz : RIYADH_TZ), 1);
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
          {t.today.tomorrowLine.replace('{count}', counted(t.today.count, next.length)).replace('{time}', lessonClock(first.starts_at, tz, cycle))}
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
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 22, color: color.ink }}
        >
          {t.today.tomorrowSchedule}
        </AppText>
      </Pressable>
    </View>
  );
}

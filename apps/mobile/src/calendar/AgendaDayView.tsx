import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import type { AgendaDay } from './agenda';
import { AgendaLessonRow } from './AgendaLessonRow';
import { dayLabel } from './week';

export interface AgendaDayViewProps {
  day: AgendaDay;
  /** Today on the Riyadh calendar: the lapis edge and «النهارده». */
  today: boolean;
  /** The day's faint availability line (agenda.availabilityLine), or null. */
  available: string | null;
  onReschedule: (lesson: LessonView) => void;
}

/**
 * One day of the week agenda: «السبت 3 أكتوبر», the teacher's availability as a faint line, then
 * the lessons in time order. A day without lessons stays, light, so the week reads whole.
 */
export function AgendaDayView({ day, today, available, onReschedule }: AgendaDayViewProps) {
  const { color } = useTheme();
  const empty = day.lessons.length === 0;
  const faint = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 };
  return (
    <View
      style={{
        gap: 4,
        paddingTop: 12,
        paddingBottom: 4,
        paddingStart: today ? 10 : 0,
        borderStartWidth: today ? 3 : 0,
        borderStartColor: color.lapis,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.ui[empty ? 500 : 700],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: today ? color.lapis : empty ? color.ink3 : color.ink,
          }}
        >
          {dayLabel(day.date)}
        </AppText>
        {today ? (
          <AppText
            style={{
              paddingHorizontal: 8,
              borderRadius: shape.radius.pill,
              overflow: 'hidden',
              fontFamily: type.ui[600],
              fontSize: type.size['2xs'],
              lineHeight: 20,
              color: color.lapis,
              backgroundColor: color.lapisWash,
            }}
          >
            {t.schedule.today}
          </AppText>
        ) : null}
      </View>
      {available ? <AppText style={faint}>{available}</AppText> : null}
      {empty ? <AppText style={faint}>{t.schedule.noLessons}</AppText> : null}
      {day.lessons.map((lesson) => (
        <AgendaLessonRow key={lesson.id} lesson={lesson} onReschedule={onReschedule} />
      ))}
    </View>
  );
}

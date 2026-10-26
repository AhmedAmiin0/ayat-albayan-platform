import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { AgendaDay } from './agenda';
import { AgendaLessonRow } from './AgendaLessonRow';
import { dayLabel } from '../lib/week';

export interface AgendaDayViewProps {
  day: AgendaDay;
  /** Today on the Riyadh calendar: a gold-soft start rule and a plain «النهارده» (gold marks, green acts, §1.1). */
  today: boolean;
  /** The day's faint availability line (agenda.availabilityLine), or null. */
  available: string | null;
  onReschedule: (lesson: LessonView) => void;
  /** «عدّل الوقت» on a row that allows it; absent for a teacher's own calendar. */
  onEditTime?: (lesson: LessonView) => void;
}

/**
 * One day of the week agenda: «السبت 3 أكتوبر», the teacher's availability as a faint line, then
 * the lessons in time order. A day without lessons stays, light, so the week reads whole.
 */
export function AgendaDayView({ day, today, available, onReschedule, onEditTime }: AgendaDayViewProps) {
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
        borderStartColor: color.goldSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.ui[empty && !today ? 500 : 700],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: empty && !today ? color.ink3 : color.ink,
          }}
        >
          {dayLabel(day.date)}
        </AppText>
        {today ? (
          <AppText style={{ fontFamily: type.ui[500], fontSize: type.size['2xs'], lineHeight: 20, color: color.ink2 }}>
            {t.schedule.today}
          </AppText>
        ) : null}
      </View>
      {available ? <AppText style={faint}>{available}</AppText> : null}
      {empty ? <AppText style={faint}>{t.schedule.noLessons}</AppText> : null}
      {day.lessons.map((lesson) => (
        <AgendaLessonRow key={lesson.id} lesson={lesson} onReschedule={onReschedule} onEditTime={onEditTime} />
      ))}
    </View>
  );
}

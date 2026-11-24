import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { t, type, useTheme, AppText, InsetGroup } from '@ab/mobile-kit';
import type { AgendaDay } from './agenda';
import { AgendaLessonRow } from './AgendaLessonRow';
import { dayLabel } from '@/calendar/lib/week';

interface AgendaDayViewProps {
  day: AgendaDay;
  /** Today on the Riyadh calendar. */
  today: boolean;
  /** The day's faint availability line (agenda.availabilityLine), or null. */
  available: string | null;
  onReschedule: (lesson: LessonView) => void;
  /** Absent for a teacher's own calendar. */
  onEditTime?: (lesson: LessonView) => void;
  /** A tap on a lesson row opens its details sheet. */
  onOpen?: (lesson: LessonView) => void;
}

/** A day without lessons stays, light, so the week reads whole. */
export function AgendaDayView({ day, today, available, onReschedule, onEditTime, onOpen }: AgendaDayViewProps) {
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
      <InsetGroup>
        {day.lessons.map((lesson) => (
          <AgendaLessonRow key={lesson.id} lesson={lesson} onReschedule={onReschedule} onEditTime={onEditTime} onOpen={onOpen} />
        ))}
      </InsetGroup>
    </View>
  );
}

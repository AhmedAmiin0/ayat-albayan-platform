import { dayTile, isAhead } from '@ab/client-core';
import { firstName, type PortalLesson, type PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { DateTile } from '#/ui/index.ts';
import { useFamilyClock } from '#/portal/index.ts';
import { rangeText, teacherText } from './lesson-text';
import { LessonChip } from './options/LessonChip';
import { RequestLine } from './options/RequestLine';
import { OptionsRow } from './OptionsRow';

interface UpcomingListProps {
  lessons: readonly PortalLesson[];
  student: PortalStudent;
  now: Date;
  /** A student's own page: «حلقاتك القادمة». */
  own?: boolean;
}

/**
 * «الحلقات القادمة» after the next one: the day, the time range and the teacher; a row opens
 * «خيارات الحلقة» (OptionsRow).
 */
export function UpcomingList({ lessons, student, now, own = false }: UpcomingListProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const later = lessons.filter((l) => isAhead(l, now)).slice(1);
  if (later.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {own ? t.portal.app.lesson.upcomingSelf : t.portal.app.lesson.upcoming}
      </AppText>
      <InsetGroup>
        {later.map((lesson) => (
          <View
            key={lesson.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
          >
            <DateTile {...dayTile(new Date(lesson.starts_at), clock)} />
            <OptionsRow lesson={lesson} student={student} clock={clock} now={now}>
              <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>
                {rangeText(lesson, clock)}
              </AppText>
              <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
                {teacherText(lesson.teacher)}
              </AppText>
              <RequestLine
                lesson={lesson}
                clock={clock}
                ink={color.ink2}
                now={now}
                student={firstName(student.name)}
              />
            </OptionsRow>
            <LessonChip lesson={lesson} />
          </View>
        ))}
      </InsetGroup>
    </View>
  );
}

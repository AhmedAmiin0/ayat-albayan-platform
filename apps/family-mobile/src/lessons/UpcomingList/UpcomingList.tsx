import { dayTile } from '@ab/client-core';
import { firstName } from '@ab/schedule';
import { View } from 'react-native';
import { AppText, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { DateTile } from '@/ui';
import { rangeText, teacherText } from '@/lessons/lesson-text';
import { LessonChip } from '@/lessons/options/LessonChip';
import { RequestLine } from '@/lessons/options/RequestLine';
import { OptionsRow } from '@/lessons/OptionsRow';
import type { UpcomingListProps } from './UpcomingList.types';
import { useUpcomingList } from './use-upcoming-list';

export function UpcomingList({ lessons, student, now, own = false }: UpcomingListProps) {
  const { color } = useTheme();
  const { clock, later } = useUpcomingList({ lessons, student, now });
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

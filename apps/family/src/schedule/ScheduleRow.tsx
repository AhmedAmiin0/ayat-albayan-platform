import { lessonMinutes, type WeekLesson } from '@ab/client-core';
import type { ClockOptions } from '@ab/shared';
import { clockOf } from '@ab/shared';
import { View } from 'react-native';
import { AppText, Avatar, t, type, useTheme } from '@ab/mobile-kit';
import { JoinAction, rangeText, teacherText } from '@/lessons';

interface ScheduleRowProps {
  entry: WeekLesson;
  /** The viewer's clock (the week is on the phone's zone). */
  clock: ClockOptions;
  now: Date;
  /** A guardian's week names the child on each row. */
  named: boolean;
}

/** One lesson of the week: (the child ·) the time, the teacher and length, «ادخل» when open. */
export function ScheduleRow({ entry, clock, now, named }: ScheduleRowProps) {
  const { color } = useTheme();
  const { student, lesson } = entry;
  const time = named
    ? `${student.name} · ${clockOf(new Date(lesson.starts_at), clock)}`
    : rangeText(lesson, clock);
  const length = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      {named ? <Avatar name={student.name} id={student.id} size="sm" decorative /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{time}</AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {`${teacherText(lesson.teacher)} · ${length}`}
        </AppText>
      </View>
      <JoinAction lesson={lesson} student={student} now={now} short />
    </View>
  );
}

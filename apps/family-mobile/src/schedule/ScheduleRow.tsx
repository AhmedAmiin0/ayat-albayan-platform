import { lessonMinutes, type WeekLesson } from '@ab/client-core';
import type { ClockOptions } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { RowText } from '@/ui';
import { JoinAction, rangeText, teacherText } from '@/lessons';

interface ScheduleRowProps {
  entry: WeekLesson;
  /** The viewer's clock (the week is on the phone's zone). */
  clock: ClockOptions;
  now: Date;
}

/** One lesson of the week: the time, the teacher and length, «ادخل» when open. */
export function ScheduleRow({ entry, clock, now }: ScheduleRowProps) {
  const { student, lesson } = entry;
  const length = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <RowText
        title={rangeText(lesson, clock)}
        line={`${teacherText(lesson.teacher)} · ${length}`}
      />
      <JoinAction lesson={lesson} student={student} now={now} short />
    </View>
  );
}

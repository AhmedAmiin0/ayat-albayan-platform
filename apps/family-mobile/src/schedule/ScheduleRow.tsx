import { lessonMinutes, liveRoom, type WeekLesson } from '@ab/client-core';
import { firstName, type ClockOptions } from '@ab/shared';
import { View } from 'react-native';
import { t, useTheme } from '@ab/mobile-kit';
import { RowText } from '#/ui/index.ts';
import {
  JoinAction, LessonChip, LiveLine, OptionsRow, rangeText, RequestLine, teacherText,
} from '#/lessons/index.ts';

interface ScheduleRowProps {
  entry: WeekLesson;
  /** The viewer's clock (the week is on the phone's zone). */
  clock: ClockOptions;
  now: Date;
}

/**
 * One lesson of the week: the time, the teacher and length (opening «خيارات الحلقة»), «جارية
 * الآن» while its room is live (canvas RoomXLivePush), its chip, «ادخل» when open.
 */
export function ScheduleRow({ entry, clock, now }: ScheduleRowProps) {
  const { student, lesson } = entry;
  const { color } = useTheme();
  const length = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  const live = liveRoom(lesson, now);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <OptionsRow lesson={lesson} student={student} clock={clock} now={now}>
        <RowText
          title={rangeText(lesson, clock)}
          line={`${teacherText(lesson.teacher)} · ${length}`}
        />
        {live ? <LiveLine live={live} /> : null}
        <RequestLine
          lesson={lesson}
          clock={{ ...clock, tz: student.tz }}
          ink={color.ink2}
          now={now}
          student={firstName(student.name)}
        />
      </OptionsRow>
      <LessonChip lesson={lesson} />
      <JoinAction lesson={lesson} student={student} now={now} short />
    </View>
  );
}

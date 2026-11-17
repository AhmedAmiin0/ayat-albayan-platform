import { lessonMinutes, liveRoom, type WeekLesson } from '@ab/client-core';
import type { ClockOptions } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { RowText } from '@/ui';
import { JoinAction, LiveLine, rangeText, teacherText } from '@/lessons';

interface ScheduleRowProps {
  entry: WeekLesson;
  /** The viewer's clock (the week is on the phone's zone). */
  clock: ClockOptions;
  now: Date;
}

/**
 * One lesson of the week: the time, the teacher and length, «جارية الآن» while its room is live
 * (canvas RoomXLivePush), «ادخل» when open.
 */
export function ScheduleRow({ entry, clock, now }: ScheduleRowProps) {
  const { student, lesson } = entry;
  const length = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  const live = liveRoom(lesson, now);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <RowText
          title={rangeText(lesson, clock)}
          line={`${teacherText(lesson.teacher)} · ${length}`}
        />
        {live ? <LiveLine live={live} /> : null}
      </View>
      <JoinAction lesson={lesson} student={student} now={now} short />
    </View>
  );
}

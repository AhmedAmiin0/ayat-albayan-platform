import { teacherConfirmed } from '@ab/client-core';
import { isRunningLesson } from '@ab/shared';
import { View } from 'react-native';
import { t, StatusChip, useNow } from '@ab/mobile-kit';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { Tag } from '@/calendar/agenda/Tag';
import type { DetailsLesson } from './details-text';

/** R-SCH-09/10/11 tags; the teacher's attendance confirmation never changes status (docs/46 C4). */
export function DetailsHead({ lesson }: { lesson: DetailsLesson }) {
  const now = useNow();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <LessonStatusChip status={lesson.status} full />
      {isRunningLesson(lesson, now) ? (
        <StatusChip tone="ok" glyph="fill" label={t.lessons.sheet.live} />
      ) : null}
      {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
      {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
      {lesson.time_edit ? <Tag>{t.lessons.timeEdit.tag}</Tag> : null}
      {teacherConfirmed(lesson) ? (
        <StatusChip tone="ok" glyph="fill" size="sm" label={t.teacherBoard.teacherConfirmed} />
      ) : null}
    </View>
  );
}

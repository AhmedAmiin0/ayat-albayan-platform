import { isRunningLesson } from '@ab/shared';
import { View } from 'react-native';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { Tag } from '@/calendar/agenda/Tag';
import type { DetailsLesson } from './details-text';

/**
 * The sheet's first line: the status chip (nuqta + word), «جارية الآن» while it runs, then the
 * kind tags «تجريبية» / «تعويضية» and «عُدّل الوقت» after an in-place edit (R-SCH-09/10/11).
 */
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
    </View>
  );
}

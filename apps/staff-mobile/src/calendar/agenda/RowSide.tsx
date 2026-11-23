import type { LessonView } from '@ab/schedule';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { LiveBadge } from '@/calendar/live/LiveBadge';
import { Tag } from './Tag';

/** The row's end: «مباشر الآن», the status chip (or the caller's chip), «تجريبية» / «تعويضية». */
export function RowSide({ lesson, chip }: { lesson: LessonView; chip?: ReactNode }) {
  return (
    <View style={{ alignItems: 'flex-end', gap: 4 }}>
      <LiveBadge lesson={lesson} />
      {chip ?? <LessonStatusChip status={lesson.status} size="sm" />}
      {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
      {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
    </View>
  );
}

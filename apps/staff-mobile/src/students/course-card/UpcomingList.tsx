import type { CourseCardLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { InsetGroup, ListRow, t } from '@ab/mobile-kit';
import { dayLabel } from '@/booking';
import { clockIn, useViewerClock } from '@/core/lib/clock';
import { Note } from '@/core/ui/feedback/Note';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { AdminLessonSheet, useLessonAction } from '@/today';
import { useCardLesson } from './course-card-api';

/** While a tapped lesson is read: «جارٍ التحميل»; gone meanwhile: «غير موجود». */
function pickLine(read: ReturnType<typeof useCardLesson>): string | null {
  if (read.isFetching) return t.common.loading;
  return read.data === null || read.isError ? t.common.notFound : null;
}

/**
 * «الحلقات القادمة» of the course (owner 2026-11-17: the admin's file had no lessons list): the
 * day, the time in the viewer's zone and the status chip («مؤكدة» / «للتأكيد»); a tap opens the
 * admin's «تفاصيل الحلقة» with «غيّر الميعاد» and the row's other actions.
 */
export function UpcomingList({ lessons }: { lessons: readonly CourseCardLesson[] }) {
  const viewer = useViewerClock();
  const [picked, setPicked] = useState<CourseCardLesson | null>(null);
  const read = useCardLesson(picked);
  const action = useLessonAction();
  const c = t.courseCard;
  const line = picked ? pickLine(read) : null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{c.upcoming}</SectionLabel>
      {lessons.length === 0 ? <Note>{c.noUpcoming}</Note> : null}
      <InsetGroup>
        {lessons.map((l) => (
          <ListRow
            key={l.id}
            title={dayLabel(new Date(l.startsAt), viewer.tz)}
            subtitle={clockIn(new Date(l.startsAt), viewer.tz, viewer.cycle)}
            trailing={<LessonStatusChip status={l.status} size="sm" />}
            onPress={() => setPicked(l)}
            accessibilityHint={t.lessons.details}
          />
        ))}
      </InsetGroup>
      {line ? <Note>{line}</Note> : null}
      {action.notice ? <Note>{action.notice}</Note> : null}
      <AdminLessonSheet
        lesson={picked ? (read.data ?? null) : null}
        onClose={() => setPicked(null)}
        action={action}
      />
    </View>
  );
}

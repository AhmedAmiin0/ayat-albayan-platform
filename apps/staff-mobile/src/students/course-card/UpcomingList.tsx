import type { CourseCardLesson } from '@ab/shared';
import { View } from 'react-native';
import { InsetGroup, ListRow, t } from '@ab/mobile-kit';
import { dayLabel } from '@/booking';
import { clockIn, useViewerClock } from '@/core/lib/clock';
import { Note } from '@/core/ui/feedback/Note';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

/**
 * «الحلقات القادمة» of the course (owner 2026-11-17: the admin's file had no lessons list): the
 * day, the time in the viewer's zone and the status chip («مؤكدة» / «للتأكيد»).
 */
export function UpcomingList({ lessons }: { lessons: readonly CourseCardLesson[] }) {
  const viewer = useViewerClock();
  const c = t.courseCard;
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
          />
        ))}
      </InsetGroup>
    </View>
  );
}

import type { SalesTeacherOverview } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { t, EmptyState, ListRow, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/more';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { SmallHeading } from '@/sales/sales/components/SmallHeading';
import { fill } from '@/sales/sales/lib/sales-text';
import { studentsLine, totalsLine } from './overview-text';

export function TeacherAttendanceTab({ attendance }: { attendance: SalesTeacherOverview['attendance'] }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const o = t.sales.teachers.overview;
  return (
    <>
      <View style={{ gap: 4 }}>
        <SmallHeading header>{fill(o.window, { days: String(attendance.days) })}</SmallHeading>
        <Note>{totalsLine(attendance.totals)}</Note>
        <SmallHeading header>{o.latest}</SmallHeading>
        {attendance.latest.length === 0 ? <EmptyState title={o.noLessons} /> : null}
      </View>
      <InsetGroup>
        {attendance.latest.map((l) => (
          <ListRow
            key={l.lesson_id}
            title={whenIn(new Date(l.starts_at), tz, cycle)}
            subtitle={studentsLine(l.students)}
            trailing={<LessonStatusChip status={l.status} size="sm" />}
          />
        ))}
      </InsetGroup>
    </>
  );
}

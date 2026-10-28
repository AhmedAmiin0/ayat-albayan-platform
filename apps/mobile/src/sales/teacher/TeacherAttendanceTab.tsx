import { lessonStatusStyle, RIYADH_TZ, type SalesTeacherOverview } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';
import { SmallHeading } from '../components/SmallHeading';
import { fill } from '../lib/sales-text';
import { studentsLine, totalsLine } from './overview-text';

/** «الحضور»: the last 30 days' totals in one line, then the latest lessons (Riyadh time, students, status chip). */
export function TeacherAttendanceTab({ attendance }: { attendance: SalesTeacherOverview['attendance'] }) {
  const cycle = useClockCycle();
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
            title={whenIn(new Date(l.starts_at), RIYADH_TZ, cycle)}
            subtitle={studentsLine(l.students)}
            trailing={<StatusChip {...lessonStatusStyle[l.status]} size="sm" label={t.enums.lessonStatus[l.status]} />}
          />
        ))}
      </InsetGroup>
    </>
  );
}

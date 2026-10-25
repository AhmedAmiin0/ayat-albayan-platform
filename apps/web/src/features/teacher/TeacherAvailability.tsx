import type { TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { availabilityQuery } from '@/features/teachers/api';
import { AvailabilityGrid } from '@/features/teachers/AvailabilityGrid';
import { gridTz } from '@/features/teachers/grid';
import { TimeOffList } from '@/features/teachers/TimeOffList';
import { t } from '@/lib/i18n/i18n';

/**
 * The teacher's own weekly availability and time-off (R-TCH-02, R-SCH-08): the same editor the
 * admin uses; the API lets a teacher write only their own row (OwnTeacherGuard). The booking
 * wizard offers only slots inside it (journey 5).
 */
export function TeacherAvailability({ me }: { me: TeacherMe }) {
  const rows = useQuery(availabilityQuery(me.id));
  if (rows.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!rows.data) return <ListSkeleton />;
  return (
    <div className="grid gap-7">
      <AvailabilityGrid key={me.id} teacherId={me.id} tz={gridTz(rows.data, me.tz)} rows={rows.data} />
      <TimeOffList teacherId={me.id} />
    </div>
  );
}

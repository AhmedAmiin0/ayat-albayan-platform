import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { availabilityQuery, teacherQuery } from './api';
import { AvailabilityGrid } from './AvailabilityGrid';
import { gridTz } from './grid';
import { TeacherDialog } from './TeacherDialog';
import { TimeOffList } from './TimeOffList';

/** Teacher profile: edit, weekly availability grid, time-off (R-TCH-01, R-TCH-02). */
export function TeacherDetailPage({ teacherId }: { teacherId: string }) {
  const teacher = useQuery(teacherQuery(teacherId));
  const availability = useQuery(availabilityQuery(teacherId));
  const [editing, setEditing] = useState(false);

  if (teacher.isError) {
    return (
      <p role="alert" className="text-destructive">
        {t.common.notFound}
      </p>
    );
  }
  if (!teacher.data) return <p className="text-muted-foreground">{t.common.loading}</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/admin/teachers" className="text-sm text-muted-foreground hover:underline">
            {t.common.back}
          </Link>
          <h2 className="text-xl font-semibold">{teacher.data.display_name_ar}</h2>
          {teacher.data.display_name_en && (
            <p dir="ltr" className="text-start text-muted-foreground">
              {teacher.data.display_name_en}
            </p>
          )}
        </div>
        <Button onClick={() => setEditing(true)}>{t.common.edit}</Button>
      </div>
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t.availability.title}</h3>
        {availability.data ? (
          <AvailabilityGrid
            teacherId={teacherId}
            tz={gridTz(availability.data, teacher.data.tz)}
            rows={availability.data}
          />
        ) : (
          <p className="text-muted-foreground">
            {availability.isError ? t.common.error : t.common.loading}
          </p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t.availability.timeOff}</h3>
        <TimeOffList teacherId={teacherId} />
      </section>
      {editing && <TeacherDialog teacher={teacher.data} onClose={() => setEditing(false)} />}
    </div>
  );
}

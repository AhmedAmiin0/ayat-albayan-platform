import { teacherStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Tabs } from '@/components/ui/layout/tabs';
import { EntityActivity } from '@/features/activity/EntityActivity';
import { t } from '@/lib/i18n/i18n';
import { availabilityQuery, teacherQuery, type Teacher } from './api';
import { AvailabilityGrid } from './AvailabilityGrid';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { gridTz } from './grid';
import { RatesTable } from './RatesTable';
import { TeacherDialog } from './TeacherDialog';
import { TeacherFacts } from './TeacherFacts';
import { TeacherMeta } from './TeacherMeta';
import { TeacherStudentsPanel } from './TeacherStudentsPanel';
import { TimeOffList } from './TimeOffList';
import { HeadActions } from '@/components/ui/layout/head-actions';
import { teacherLabel } from '@/lib/i18n/teacher-label';

type Tab = 'data' | 'availability' | 'students' | 'activity';
// «المستحقات» is its own page (the earnings button in the head).
const TABS: { value: Tab; label: string }[] = [
  { value: 'data', label: t.teachers.tabData },
  { value: 'availability', label: t.availability.title },
  { value: 'students', label: t.teachers.tabStudents },
  { value: 'activity', label: t.activity.profileTitle },
];

/** «المواعيد المتاحة» tab: the weekly editor, then time-off beside the rates (docs/07 §8). */
function AvailabilityPanel({ teacher }: { teacher: Teacher }) {
  const availability = useQuery(availabilityQuery(teacher.id));
  return (
    <>
      {availability.data ? (
        <AvailabilityGrid
          key={teacher.id}
          teacherId={teacher.id}
          tz={gridTz(availability.data, teacher.tz)}
          rows={availability.data}
        />
      ) : availability.isError ? (
        <FormAlert>{t.common.error}</FormAlert>
      ) : (
        <ListSkeleton />
      )}
      <div className="mt-7 grid gap-7 shell:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <TimeOffList teacherId={teacher.id} />
        <RatesTable teacher={teacher} />
      </div>
    </>
  );
}

/** Teacher profile (R-TCH-01, R-TCH-02): cartouche name + status, meta line, tabs. */
export function TeacherDetailPage({ teacherId }: { teacherId: string }) {
  const teacher = useQuery(teacherQuery(teacherId));
  const [tab, setTab] = useState<Tab>('availability');
  const [editing, setEditing] = useState(false);

  if (teacher.isError) return <FormAlert>{t.common.notFound}</FormAlert>;
  if (!teacher.data) return <ListSkeleton />;
  const data = teacher.data;

  return (
    <>
      <PageHead className="mb-3.5">
        <Cartouche>{teacherLabel(data)}</Cartouche>
        <StatusChip {...teacherStatusStyle[data.status]} label={t.enums.teacherStatus[data.status]} />
        <HeadActions
          primary={
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t.teachers.edit}
            </Button>
          }
          more={
            <Link to="/admin/teachers/$teacherId/earnings" params={{ teacherId }} className={buttonVariants({ variant: 'secondary' })}>
              {t.earnings.title}
            </Link>
          }
        />
      </PageHead>
      <TeacherMeta teacher={data} />
      <Tabs label={t.teachers.profile} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label}>
        {tab === 'availability' ? (
          <AvailabilityPanel teacher={data} />
        ) : tab === 'students' ? (
          <TeacherStudentsPanel teacherId={data.id} />
        ) : tab === 'activity' ? (
          <EntityActivity entity="teachers" entityId={data.id} />
        ) : (
          <TeacherFacts teacher={data} />
        )}
      </div>
      {editing && <TeacherDialog teacher={data} onClose={() => setEditing(false)} />}
    </>
  );
}

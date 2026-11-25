import { teacherStatusStyle } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Button,
  buttonVariants,
  Avatar,
  Cartouche,
  PageHead,
  StatusChip,
  Tabs,
  t,
  FormAlert,
  ListSkeleton,
  HeadActions,
  teacherLabel,
} from '@ab/web-kit';
import { StaffPhotoControl } from '@/features/people/staff-photo';
import { EntityActivity } from '@/features/reporting/activity/EntityActivity';
import { TeacherCalendarOwner } from '@/features/platform/google-sync';
import { availabilityQuery, teacherQuery } from '@/features/people/teachers/api';
import { AvailabilityGrid } from '@/features/people/teachers/availability/AvailabilityGrid';
import { gridTz } from '@/features/people/teachers/availability/grid';
import { RatesTable } from './RatesTable';
import { TeacherDialog } from '@/features/people/teachers/form/TeacherDialog';
import { TeacherFacts } from './TeacherFacts';
import { TeacherMeta } from './TeacherMeta';
import { TeacherStudentsPanel } from './TeacherStudentsPanel';
import { TimeOffList } from '@/features/people/teachers/time-off/TimeOffList';
import type { Teacher } from '@ab/shared';

type Tab = 'data' | 'availability' | 'students' | 'activity';
const TABS: { value: Tab; label: string }[] = [
  { value: 'data', label: t.teachers.tabData },
  { value: 'availability', label: t.availability.title },
  { value: 'students', label: t.teachers.tabStudents },
  { value: 'activity', label: t.activity.profileTitle },
];

/** docs/07 §8. */
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

/** Teacher profile (R-TCH-01, R-TCH-02): photo, cartouche name + status, meta line, the admin's photo control, tabs. */
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
        <Avatar name={teacherLabel(data)} id={data.id} src={data.avatar_url} size="lg" decorative />
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
      <StaffPhotoControl kind="teachers" id={data.id} name={teacherLabel(data)} hasPhoto={!!data.avatar_url} className="mb-4 max-w-xl" />
      <Tabs label={t.teachers.profile} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label}>
        {tab === 'availability' ? (
          <AvailabilityPanel teacher={data} />
        ) : tab === 'students' ? (
          <TeacherStudentsPanel teacherId={data.id} />
        ) : tab === 'activity' ? (
          <EntityActivity entity="teachers" entityId={data.id} />
        ) : (
          <>
            <TeacherFacts teacher={data} />
            <TeacherCalendarOwner teacherId={data.id} />
          </>
        )}
      </div>
      {editing && <TeacherDialog teacher={data} onClose={() => setEditing(false)} />}
    </>
  );
}

import { teacherStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { StatusChip } from '@/components/ui/status-chip';
import { Tabs } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { availabilityQuery, teacherQuery, type Teacher } from './api';
import { AvailabilityGrid } from './AvailabilityGrid';
import { FormAlert } from '@/components/ui/form-alert';
import { gridTz } from './grid';
import { RatesTable } from './RatesTable';
import { TeacherDialog } from './TeacherDialog';
import { TeacherFacts } from './TeacherFacts';
import { TeacherMeta } from './TeacherMeta';
import { TimeOffList } from './TimeOffList';

type Tab = 'data' | 'availability';
// TODO(R-TCH-03, R-TCH-04): «الطلاب» and «المستحقات» tabs once their data exists.
const TABS: { value: Tab; label: string }[] = [
  { value: 'data', label: t.teachers.tabData },
  { value: 'availability', label: t.availability.title },
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
        <p className="py-6 text-center text-ink-3">{t.common.loading}</p>
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
  if (!teacher.data) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  const data = teacher.data;

  return (
    <>
      <PageHead className="mb-3.5">
        <Cartouche>{data.display_name_ar}</Cartouche>
        <StatusChip {...teacherStatusStyle[data.status]} label={t.enums.teacherStatus[data.status]} />
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Link to="/admin/teachers/$teacherId/earnings" params={{ teacherId }} className={buttonVariants({ variant: 'secondary' })}>
            {t.teacherEarnings.open}
          </Link>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t.teachers.edit}
          </Button>
        </div>
      </PageHead>
      <TeacherMeta teacher={data} />
      <Tabs label={t.teachers.profile} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label}>
        {tab === 'availability' ? <AvailabilityPanel teacher={data} /> : <TeacherFacts teacher={data} />}
      </div>
      {editing && <TeacherDialog teacher={data} onClose={() => setEditing(false)} />}
    </>
  );
}

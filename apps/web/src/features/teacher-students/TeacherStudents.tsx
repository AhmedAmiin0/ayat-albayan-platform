import type { TeacherStudentKind } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Tabs } from '@/components/ui/tabs';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { teacherStudentsQuery } from './api';
import { teacherStudentColumns } from './columns';

const KINDS = (): { value: TeacherStudentKind; label: string }[] => [
  { value: 'subscribed', label: t.teacherStudents.subscribed },
  { value: 'trial', label: t.teacherStudents.trial },
];

/**
 * /teacher/students «الطلاب» (R-TCH-03): my students in two separate lists, «مشتركين» and
 * «تجريبي» — never mixed. Only the selected kind is fetched. No phone, guardian or money. Every
 * column sorts, and name / code / program / level filter, on the loaded list (R-NFR-08).
 */
export function TeacherStudents() {
  const [kind, setKind] = useState<TeacherStudentKind>('subscribed');
  const list = useQuery(teacherStudentsQuery(kind));
  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherStudents.title}</Cartouche>
      </PageHead>
      <Tabs label={t.teacherStudents.kinds} tabs={KINDS()} value={kind} onChange={setKind} />
      <div role="tabpanel" aria-label={t.teacherStudents[kind]}>
        {list.isPending && <ListSkeleton />}
        {list.isError && (
          <FormAlert>
            {t.teacherStudents.loadFailed}{' '}
            <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
              {t.teacherStudents.retry}
            </Button>
          </FormAlert>
        )}
        {list.data?.length === 0 && (
          <EmptyState title={kind === 'trial' ? t.teacherStudents.emptyTrial : t.teacherStudents.emptySubscribed} />
        )}
        {list.data && list.data.length > 0 && (
          <DataTable stacked clientSort clientFilter columns={teacherStudentColumns} data={list.data} getRowId={(s) => s.id} />
        )}
      </div>
    </>
  );
}

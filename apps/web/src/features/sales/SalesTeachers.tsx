import { PROGRAMS } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Drawer } from '@/features/schedule/Drawer';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { salesTeachersQuery } from './academy-api';
import { TeacherDetail } from './TeacherDetail';
import { TeacherFilters } from './TeacherFilters';
import { TeacherListItem } from './TeacherListItem';
import { filterTeachers, isFiltered, NO_FILTER, programsOf } from './teacher-view';

/**
 * /sales/teachers «المعلمون» (owner report 2026-10-12: master-detail instead of one crammed row): the
 * teachers list with search and program / gender filters; a teacher opens a side drawer with their
 * students. Read-only, no pay, rates or phone; the teacher's fixed meeting link is the one exception
 * (owner 2026-10-12), shown in the drawer only.
 */
export function SalesTeachers() {
  const query = useQuery(salesTeachersQuery);
  const [filter, setFilter] = useState(NO_FILTER);
  const [openId, setOpenId] = useState<string | null>(null);
  const all = query.data ?? [];
  const shown = filterTeachers(all, filter);
  const open = all.find((tc) => tc.id === openId);
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.teachers.title}</Cartouche>
      </PageHead>
      {query.isPending && <ListSkeleton />}
      {query.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {query.data?.length === 0 && <EmptyState title={t.sales.teachers.empty}>{t.sales.teachers.emptyHint}</EmptyState>}
      {all.length > 0 && (
        <>
          <TeacherFilters value={filter} programs={programsOf(all, PROGRAMS)} onChange={setFilter} />
          {shown.length === 0 ? (
            <EmptyState
              title={t.sales.teachers.noMatch}
              action={
                isFiltered(filter) && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setFilter(NO_FILTER)}>
                    {t.sales.teachers.clearFilters}
                  </Button>
                )
              }
            >
              {t.sales.teachers.noMatchHint}
            </EmptyState>
          ) : (
            <ul aria-label={t.sales.teachers.listLabel} className="border-t border-rule">
              {shown.map((tc) => (
                <TeacherListItem key={tc.id} teacher={tc} selected={tc.id === openId} onSelect={setOpenId} />
              ))}
            </ul>
          )}
        </>
      )}
      {open && (
        <Drawer
          title={t.sales.teachers.detailTitle.replace('{name}', teacherLabel({ display_name_ar: open.name, display_name_en: open.name_en }))}
          onClose={() => setOpenId(null)}
        >
          <TeacherDetail key={open.id} teacher={open} />
        </Drawer>
      )}
    </>
  );
}

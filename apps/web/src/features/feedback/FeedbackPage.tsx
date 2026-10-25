import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { teacherOptionsQuery } from '@/features/students/api';
import { t } from '@/lib/i18n';
import { serverListProps, serverListState, type ServerListPatch, type ServerListSearch } from '@/lib/server-list-search';
import { teacherLabel } from '@/lib/teacher-label';
import { FEEDBACK_PAGE_SIZE, feedbackListQuery, feedbackSummaryQuery } from './api';
import { FeedbackTable } from './FeedbackTable';
import { FEEDBACK_LIST_KEYS } from './search';
import { TeacherAverages } from './TeacherAverages';

export interface FeedbackPageProps {
  /** The route's search: page, sort and column filters (R-NFR-08). */
  search: ServerListSearch;
  onSearch: (patch: ServerListPatch) => void;
}

/**
 * /admin/feedback «رأيك يهمّنا» (admin): each teacher's average on top, then the answers; every
 * column sorts and filters on the server. The table stays while a filter matches nothing, so the
 * filter row can still be cleared.
 */
export function FeedbackPage({ search, onSearch }: FeedbackPageProps) {
  const state = serverListState(search, FEEDBACK_LIST_KEYS);
  const table = serverListProps(state, onSearch);
  const teachers = useQuery(teacherOptionsQuery);
  const summary = useQuery(feedbackSummaryQuery);
  const list = useQuery(feedbackListQuery(state));
  const teacherOptions = useMemo(() => (teachers.data ?? []).map((tc) => ({ value: tc.id, label: teacherLabel(tc) })), [teachers.data]);

  return (
    <>
      <PageHead>
        <Cartouche>{t.feedback.title}</Cartouche>
      </PageHead>
      <TeacherAverages
        items={(summary.data ?? []).map((s) => ({
          key: s.teacher.id,
          name: s.teacher.name,
          avg: s.avg_rating,
          n: s.n,
          yesPct: s.recommend_yes_pct,
        }))}
      />
      {list.isPending && <ListSkeleton />}
      {list.isError && <FormAlert>{t.feedback.listError}</FormAlert>}
      {list.data && (
        <>
          <FeedbackTable rows={list.data.items} showTeacher teachers={teacherOptions} sort={table.sort} filters={table.filters} />
          <Pager page={state.page} total={list.data.total} pageSize={FEEDBACK_PAGE_SIZE} onPage={table.onPage} />
        </>
      )}
    </>
  );
}

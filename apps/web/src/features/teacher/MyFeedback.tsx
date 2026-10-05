import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { ListSkeleton } from '@/components/ui/skeleton';
import { FEEDBACK_PAGE_SIZE, myFeedbackQuery } from '@/features/feedback/api';
import { FeedbackTable } from '@/features/feedback/FeedbackTable';
import { MY_FEEDBACK_LIST_KEYS } from '@/features/feedback/search';
import { TeacherAverages } from '@/features/feedback/TeacherAverages';
import { t } from '@/lib/i18n';
import { serverListProps, serverListState, type ServerListPatch, type ServerListSearch } from '@/lib/server-list-search';

export interface MyFeedbackProps {
  /** The route's search: page, sort and column filters (R-NFR-08). */
  search: ServerListSearch;
  onSearch: (patch: ServerListPatch) => void;
}

/** /teacher/feedback «آراء الطلاب»: only my students' answers (no phone, no guardian), sortable and filterable, and my average. */
export function MyFeedback({ search, onSearch }: MyFeedbackProps) {
  const state = serverListState(search, MY_FEEDBACK_LIST_KEYS);
  const table = serverListProps(state, onSearch);
  const mine = useQuery(myFeedbackQuery(state));
  const average = mine.data?.average;
  return (
    <>
      <PageHead>
        <Cartouche>{t.feedback.mine}</Cartouche>
      </PageHead>
      {mine.isPending && <ListSkeleton />}
      {mine.isError && <FormAlert>{t.feedback.listError}</FormAlert>}
      {average && <TeacherAverages items={[{ key: 'me', avg: average.avg_rating, n: average.n, yesPct: average.recommend_yes_pct }]} />}
      {mine.data && (
        <>
          <FeedbackTable rows={mine.data.items} showTeacher={false} sort={table.sort} filters={table.filters} />
          <Pager page={state.page} total={mine.data.total} pageSize={FEEDBACK_PAGE_SIZE} onPage={table.onPage} />
        </>
      )}
    </>
  );
}

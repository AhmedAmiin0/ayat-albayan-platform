import { useQuery } from '@tanstack/react-query';
import { Cartouche, FormAlert, PageHead, Pager, ListSkeleton, t } from '@ab/web-kit';
import { FEEDBACK_PAGE_SIZE, myFeedbackQuery } from '@/features/teaching/feedback/api';
import { FeedbackTable } from '@/features/teaching/feedback/FeedbackTable';
import { MY_FEEDBACK_LIST_KEYS } from '@/features/teaching/feedback/search';
import { TeacherAverages } from '@/features/teaching/feedback/TeacherAverages';
import { serverListProps, serverListState, type ServerListPatch, type ServerListSearch } from '@/lib/list/server-list-search';

export interface MyFeedbackProps {
  /** The route's search: page, sort and column filters (R-NFR-08). */
  search: ServerListSearch;
  onSearch: (patch: ServerListPatch) => void;
}

/** Only her students' answers, with no phone or guardian data. */
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

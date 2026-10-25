import { createFileRoute } from '@tanstack/react-router';
import { MY_FEEDBACK_LIST_KEYS } from '@/features/feedback/search';
import { MyFeedback } from '@/features/teacher/MyFeedback';
import { parseServerListSearch } from '@/lib/list/server-list-search';

/** /teacher/feedback?page&sort&dir&f_<key> «آراء الطلاب» — what my students said, and my average. */
export const Route = createFileRoute('/teacher/feedback')({
  validateSearch: (s: Record<string, unknown>) => parseServerListSearch(s, MY_FEEDBACK_LIST_KEYS),
  component: MyFeedbackRoute,
});

function MyFeedbackRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <MyFeedback search={search} onSearch={(patch) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })} />;
}

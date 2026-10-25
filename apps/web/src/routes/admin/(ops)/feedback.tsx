import { createFileRoute } from '@tanstack/react-router';
import { FeedbackPage } from '@/features/feedback/FeedbackPage';
import { FEEDBACK_LIST_KEYS } from '@/features/feedback/search';
import { parseServerListSearch } from '@/lib/list/server-list-search';

/** /admin/feedback?page&sort&dir&f_<key> «رأيك يهمّنا» — what the students said, with each teacher's average. */
export const Route = createFileRoute('/admin/(ops)/feedback')({
  validateSearch: (s: Record<string, unknown>) => parseServerListSearch(s, FEEDBACK_LIST_KEYS),
  component: FeedbackRoute,
});

function FeedbackRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <FeedbackPage search={search} onSearch={(patch) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })} />;
}

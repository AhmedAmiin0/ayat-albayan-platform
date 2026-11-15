import { createFileRoute } from '@tanstack/react-router';
import { ChildPage, parseChildSearch } from '@/features/children';
import { requireTab, WithHome } from '@/features/shell';

/** One of a guardian's children; `?tab=` opens a tab (an alert opens the package). */
export const Route = createFileRoute('/_family/children/$studentId')({
  validateSearch: parseChildSearch,
  beforeLoad: ({ context }) => requireTab(context, 'children'),
  component: Child,
});

function Child() {
  const { studentId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <WithHome>
      {(home) => (
        <ChildPage
          home={home}
          studentId={studentId}
          tab={tab}
          onTab={(next) => void navigate({ search: { tab: next } })}
        />
      )}
    </WithHome>
  );
}

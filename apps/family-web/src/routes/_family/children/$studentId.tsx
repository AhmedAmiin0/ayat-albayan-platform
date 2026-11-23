import { createFileRoute } from '@tanstack/react-router';
import { ChildPage, parseChildSearch } from '#/features/children/index.ts';
import { WithHome } from '#/features/shell/index.ts';

/**
 * One of a guardian's children, never filtered by the pick (a push or a link opens it); `?tab=`
 * opens a tab (an alert opens the package).
 */
export const Route = createFileRoute('/_family/children/$studentId')({
  validateSearch: parseChildSearch,
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

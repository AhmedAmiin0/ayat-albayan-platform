import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { AssistantsPage } from '@/features/people/assistants/AssistantsPage';

/** Sales team (R-ASST-05); the assistants.$assistantId child replaces the list. */
export const Route = createFileRoute('/admin/assistants')({
  component: AssistantsRoute,
});

function AssistantsRoute() {
  const hasChild = useChildMatches().length > 0;
  return hasChild ? <Outlet /> : <AssistantsPage />;
}

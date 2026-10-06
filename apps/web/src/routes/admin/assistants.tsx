import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { AssistantsPage } from '@/features/assistants/AssistantsPage';

/** /admin/assistants: «المساعدون» (R-ASST-05). Parent of assistants.$assistantId, which replaces the list. */
export const Route = createFileRoute('/admin/assistants')({
  component: AssistantsRoute,
});

function AssistantsRoute() {
  const hasChild = useChildMatches().length > 0;
  return hasChild ? <Outlet /> : <AssistantsPage />;
}

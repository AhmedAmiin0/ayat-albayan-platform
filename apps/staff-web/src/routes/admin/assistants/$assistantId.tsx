import { createFileRoute } from '@tanstack/react-router';
import { AssistantDetailPage } from '@/features/people/assistants/AssistantDetailPage';

/** /admin/assistants/:assistantId: one assistant's terms, commissions, statements (R-ASST-05). */
export const Route = createFileRoute('/admin/assistants/$assistantId')({
  component: AssistantRoute,
});

function AssistantRoute() {
  const { assistantId } = Route.useParams();
  return <AssistantDetailPage assistantId={assistantId} />;
}

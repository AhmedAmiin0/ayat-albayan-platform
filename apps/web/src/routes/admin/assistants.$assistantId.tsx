import { createFileRoute } from '@tanstack/react-router';
import { AssistantDetailPage } from '@/features/assistants/AssistantDetailPage';

/** /admin/assistants/:assistantId: terms, commissions and statements of one assistant (R-ASST-05). */
export const Route = createFileRoute('/admin/assistants/$assistantId')({
  component: AssistantRoute,
});

function AssistantRoute() {
  const { assistantId } = Route.useParams();
  return <AssistantDetailPage assistantId={assistantId} />;
}

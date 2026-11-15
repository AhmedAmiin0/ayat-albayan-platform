import { createFileRoute } from '@tanstack/react-router';
import { AssistantShell } from '@/components/shell/nav/SectionShells';
import { requireRole } from '@/features/people/auth/me';

/** /assistant: a teaching assistant's own page (no nav: one list). */
export const Route = createFileRoute('/assistant')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'assistant'),
  component: AssistantShell,
});

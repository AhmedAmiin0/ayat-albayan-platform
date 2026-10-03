import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { t } from '@/lib/i18n';

/** /assistant: a teaching assistant's own page (no nav: one list). */
export const Route = createFileRoute('/assistant')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'assistant'),
  component: () => <AppShell title={t.classroom.assistants.homeTitle} />,
});

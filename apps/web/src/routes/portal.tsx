import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { t } from '@/lib/i18n';

// TODO(R-AUTH-01): guardian magic-link portal (/portal/:token) — open question 4 in 05-build-plan.
export const Route = createFileRoute('/portal')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['guardian', 'student']),
  component: () => <AppShell title={t.portal.dashboardTitle} home="/portal" />,
});

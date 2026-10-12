import { createFileRoute } from '@tanstack/react-router';
import { PortalShell } from '@/components/shell/SectionShells';
import { requireRole } from '@/features/auth/me';

// TODO(R-AUTH-01): guardian magic-link portal (/portal/:token) — open question 4 in 05-build-plan.
export const Route = createFileRoute('/portal')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['guardian', 'student']),
  component: PortalShell,
});

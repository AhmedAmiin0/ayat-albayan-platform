import { createFileRoute } from '@tanstack/react-router';
import { PortalShell } from '@/components/shell/nav/SectionShells';
import { requireRole } from '@/features/people/auth/me';

// The family portal (docs/31): PortalShell renders the page itself at /portal (no child routes).
export const Route = createFileRoute('/portal')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['guardian', 'student']),
  component: PortalShell,
});

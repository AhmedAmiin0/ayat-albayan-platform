import { createFileRoute } from '@tanstack/react-router';
import { PortalShell } from '@/components/shell/nav/SectionShells';
import { FamilyMoved, leaveForFamilyHost } from '@/features/people/auth';
import { requireRole } from '@ab/web-kit';

// The family portal (docs/31): PortalShell renders the page itself at /portal (no child routes).
// Once the family host is live (VITE_FAMILY_ORIGIN, docs/51 §3) a family is sent there instead.
export const Route = createFileRoute('/portal')({
  beforeLoad: async ({ context, location }) => {
    const movedTo = await leaveForFamilyHost(context.queryClient, {
      path: location.href,
      signedOutIsFamily: true,
    });
    if (movedTo === null) await requireRole(context.queryClient, ['guardian', 'student']);
    return { movedTo };
  },
  component: PortalRoute,
});

function PortalRoute() {
  const { movedTo } = Route.useRouteContext();
  return movedTo === null ? <PortalShell /> : <FamilyMoved url={movedTo} />;
}

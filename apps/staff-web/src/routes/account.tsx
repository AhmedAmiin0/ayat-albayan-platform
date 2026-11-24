import { USER_ROLES } from '@ab/catalog';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PortalShell, SHELL_OF } from '@/components/shell/nav/SectionShells';
import { FamilyMoved, leaveForFamilyHost } from '@/features/people/auth';
import { meQuery, requireRole } from '@ab/web-kit/auth/me';

/**
 * /account «حسابي» (R-ACC-01..05): every signed-in role, inside the shell that role normally gets
 * (admin sidebar, teacher/sales top bar, assistant/portal top bar). The page is the index child.
 * A family is sent to the family host once it is live (VITE_FAMILY_ORIGIN, docs/51 §3).
 */
export const Route = createFileRoute('/account')({
  beforeLoad: async ({ context, location }) => {
    const movedTo = await leaveForFamilyHost(context.queryClient, {
      path: location.href,
      signedOutIsFamily: false,
    });
    if (movedTo === null) await requireRole(context.queryClient, USER_ROLES);
    return { movedTo };
  },
  component: AccountShell,
});

function AccountShell() {
  const { movedTo } = Route.useRouteContext();
  const role = useQuery(meQuery).data?.role;
  if (movedTo !== null) return <FamilyMoved url={movedTo} />;
  const Shell = role ? SHELL_OF[role] : PortalShell;
  return <Shell />;
}

import { USER_ROLES } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PortalShell, SHELL_OF } from '@/components/shell/nav/SectionShells';
import { meQuery, requireRole } from '@/features/people/auth/me';

/**
 * /account «حسابي» (R-ACC-01..05): every signed-in role, inside the shell that role normally gets
 * (admin sidebar, teacher/sales top bar, assistant/portal top bar). The page is the index child.
 */
export const Route = createFileRoute('/account')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, USER_ROLES),
  component: AccountShell,
});

function AccountShell() {
  const role = useQuery(meQuery).data?.role;
  const Shell = role ? SHELL_OF[role] : PortalShell;
  return <Shell />;
}

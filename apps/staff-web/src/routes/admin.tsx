import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminShell } from '@/components/shell/nav/SectionShells';
import { adminRedirect } from '@/features/people/auth/admin-access';
import { requireRole } from '@ab/web-kit';

export const Route = createFileRoute('/admin')({
  // Base role admin gets the admin app; each page needs its permission (auth/admin-access).
  beforeLoad: async ({ context, location }) => {
    const me = await requireRole(context.queryClient, 'admin');
    const to = adminRedirect(me, location.pathname);
    if (to && to !== location.pathname) throw redirect({ to });
  },
  component: AdminShell,
});

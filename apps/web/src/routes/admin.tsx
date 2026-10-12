import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminShell } from '@/components/shell/SectionShells';
import { adminRedirect } from '@/features/auth/admin-access';
import { requireRole } from '@/features/auth/me';

export const Route = createFileRoute('/admin')({
  // Base role admin gets the admin app; each page then needs its permission (features/auth/admin-access).
  beforeLoad: async ({ context, location }) => {
    const me = await requireRole(context.queryClient, 'admin');
    const to = adminRedirect(me, location.pathname);
    if (to && to !== location.pathname) throw redirect({ to });
  },
  // The permission-filtered sidebar / «القائمة» sheet (components/shell/SectionShells).
  component: AdminShell,
});

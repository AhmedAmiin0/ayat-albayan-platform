import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/shell/SectionShells';
import { guardAdmin } from '@/features/auth/admin-guard';

export const Route = createFileRoute('/admin')({
  // Base role admin gets the admin app; each page then needs its permission (features/auth/admin-access).
  // No page at all: signed out before /login, so the session cannot loop (features/auth/admin-guard).
  beforeLoad: ({ context, location }) => guardAdmin(context.queryClient, location.pathname),
  // The permission-filtered sidebar / «القائمة» sheet (components/shell/SectionShells).
  component: AdminShell,
});

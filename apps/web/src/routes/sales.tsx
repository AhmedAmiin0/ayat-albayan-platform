import { createFileRoute } from '@tanstack/react-router';
import { SalesShell } from '@/components/shell/SectionShells';
import { requireRole } from '@/features/auth/me';

export const Route = createFileRoute('/sales')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'sales'),
  component: SalesShell,
});

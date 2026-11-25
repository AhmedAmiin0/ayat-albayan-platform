import { createFileRoute } from '@tanstack/react-router';
import { SalesShell } from '@/components/shell/nav/SectionShells';
import { requireRole } from '@ab/web-kit';

export const Route = createFileRoute('/sales')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'sales'),
  component: SalesShell,
});

import { createFileRoute } from '@tanstack/react-router';
import { GooglePage } from '@/features/settings/pages/GooglePage';

/** /admin/settings/google — docs/26b §3: its section on its own short page. */
export const Route = createFileRoute('/admin/settings/google')({
  component: GooglePage,
});

import { createFileRoute } from '@tanstack/react-router';
import { GooglePage } from '@/features/settings/pages/GooglePage';
import { parseOauthReturnSearch } from '@/features/settings/pages/page-search';

/**
 * /admin/settings/google «مزامنة Google» — docs/26b §3. Keeps Google's OAuth return (`?google=…`):
 * the page shows its note once, then clears the query.
 */
export const Route = createFileRoute('/admin/settings/google')({
  validateSearch: parseOauthReturnSearch,
  component: GooglePage,
});

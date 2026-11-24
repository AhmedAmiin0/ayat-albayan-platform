import { createFileRoute } from '@tanstack/react-router';
import { GooglePage } from '@/features/platform/settings/pages/GooglePage';
import { parseOauthReturnSearch } from '@/features/platform/settings/pages/page-search';

/** docs/26b §3: shows the OAuth return note (`?google=`) once, then clears the query. */
export const Route = createFileRoute('/admin/settings/google')({
  validateSearch: parseOauthReturnSearch,
  component: GooglePage,
});

import { createFileRoute, redirect } from '@tanstack/react-router';
import { oauthReturnRedirect, parseOauthReturnSearch } from '@/features/platform/settings/pages/page-search';
import { IntegrationsPage } from '@/features/platform/settings/pages/IntegrationsPage';

/**
 * /admin/settings/integrations «التكاملات» — docs/26b §3. Google's OAuth return (`?google=…`, forwarded
 * here from /admin/settings) belongs to «مزامنة Google»: go there at once with the same query.
 */
export const Route = createFileRoute('/admin/settings/integrations')({
  validateSearch: parseOauthReturnSearch,
  beforeLoad: ({ search }) => {
    const to = oauthReturnRedirect(search);
    if (to) throw redirect(to);
  },
  component: IntegrationsPage,
});

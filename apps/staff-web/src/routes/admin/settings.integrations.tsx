import { createFileRoute, redirect } from '@tanstack/react-router';
import { oauthReturnRedirect, parseOauthReturnSearch } from '@/features/platform/settings/pages/page-search';
import { IntegrationsPage } from '@/features/platform/settings/pages/IntegrationsPage';

/** The OAuth return (`?google=`) belongs to the Google sync page: redirect with the query. */
export const Route = createFileRoute('/admin/settings/integrations')({
  validateSearch: parseOauthReturnSearch,
  beforeLoad: ({ search }) => {
    const to = oauthReturnRedirect(search);
    if (to) redirect({ ...to, throw: true });
  },
  component: IntegrationsPage,
});

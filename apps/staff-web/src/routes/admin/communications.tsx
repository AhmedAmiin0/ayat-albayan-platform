import { createFileRoute, redirect } from '@tanstack/react-router';
import { communicationsAliasRedirect } from '@/features/platform/settings/pages/page-search';

/** The address docs/23 §2d gives; redirects to /admin/settings/communications keeping the query. */
export const Route = createFileRoute('/admin/communications')({
  beforeLoad: ({ search }) => {
    throw redirect(communicationsAliasRedirect(search));
  },
});

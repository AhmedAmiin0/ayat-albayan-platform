import { createFileRoute, redirect } from '@tanstack/react-router';
import { communicationsAliasRedirect } from '@/features/platform/settings/pages/page-search';

/**
 * /admin/communications — the address docs/23 §2d gives «التواصل»: it opens
 * /admin/settings/communications with the whole query (`?tab=` …), replacing the entry.
 */
export const Route = createFileRoute('/admin/communications')({
  beforeLoad: ({ search }) => {
    throw redirect(communicationsAliasRedirect(search));
  },
});

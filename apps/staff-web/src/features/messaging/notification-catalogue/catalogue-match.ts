import { matchesText } from '@/components/settings/search/settings-search';
import { t } from '@ab/web-kit';

/** The old name still matches; the old read-only intro is never matched (docs/26b §3). */
export const catalogueMatch = (query: string): boolean =>
  matchesText(`${t.notificationRules.title} ${t.notificationRules.intro} ${t.notificationCatalogue.title}`, query);

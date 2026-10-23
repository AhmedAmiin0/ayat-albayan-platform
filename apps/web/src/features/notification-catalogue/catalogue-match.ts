import { matchesText } from '@/components/settings/settings-search';
import { t } from '@/lib/i18n';

/** Does the search match «ماذا يُرسل ومتى» (its title or intro)? */
export const catalogueMatch = (query: string): boolean =>
  matchesText(`${t.notificationCatalogue.title} ${t.notificationCatalogue.intro}`, query);

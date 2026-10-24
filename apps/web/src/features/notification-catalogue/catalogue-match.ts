import { matchesText } from '@/components/settings/settings-search';
import { t } from '@/lib/i18n';

/**
 * Does the search match «الإشعارات» (its title or intro, editable now: docs/26b §3)? Its old name
 * «ماذا يُرسل ومتى» still finds it; the old read-only intro («للاطلاع فقط») is never matched or shown.
 */
export const catalogueMatch = (query: string): boolean =>
  matchesText(`${t.notificationRules.title} ${t.notificationRules.intro} ${t.notificationCatalogue.title}`, query);

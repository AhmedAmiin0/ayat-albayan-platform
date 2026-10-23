import { matchesText } from '@/components/settings/settings-search';
import { t } from '@/lib/i18n';

/** Does the search match the template section's own text (its title, intro, «القوالب حسب الرقم»)? */
export const templatesMatch = (query: string): boolean => {
  const p = t.templates.perNumber;
  return matchesText(`${t.templates.title} ${t.templates.intro} ${p.title} ${p.sync}`, query);
};

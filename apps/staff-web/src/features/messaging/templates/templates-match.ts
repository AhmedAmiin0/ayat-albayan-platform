import { matchesText } from '@/components/settings/search/settings-search';
import { t } from '@ab/web-kit';

export const templatesMatch = (query: string): boolean => {
  const p = t.templates.perNumber;
  return matchesText(`${t.templates.title} ${t.templates.intro} ${p.title} ${p.sync}`, query);
};

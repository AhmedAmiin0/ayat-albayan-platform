import { matchesText } from '@/components/settings/search/settings-search';
import { t } from '@ab/web-kit';

/** Does the search match LinesCard's own text? */
export const linesMatch = (query: string): boolean =>
  matchesText(`${t.templates.settings.lines.title} ${t.templates.settings.lines.intro}`, query);

import type { SettingsPageSection } from '@/components/settings/section-id';
import { matchesText } from '@/components/settings/search/settings-search';
import { t } from '@/lib/i18n';

/** «الأرقام» on /admin/settings: its section id (`#settings-numbers`) and its title. */
export const NUMBERS_SECTION: SettingsPageSection = { id: 'numbers', label: t.numbers.title };

/** Does the settings search match «الأرقام» (its title, intro, import, parity or source words)? */
export const numbersMatch = (query: string): boolean => {
  const n = t.numbers;
  return matchesText([n.title, n.intro, n.linkCard, n.import.title, n.parity.title, n.source.title].join(' '), query);
};

import type { SettingsPageSection } from '@/components/settings/section-id';
import { matchesText } from '@/components/settings/search/settings-search';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const NUMBERS_SECTION: SettingsPageSection = { id: 'numbers', label: t.numbers.title };

export const numbersMatch = (query: string): boolean => {
  const n = t.numbers;
  return matchesText([n.title, n.intro, n.linkCard, n.import.title, n.parity.title, n.source.title].join(' '), query);
};

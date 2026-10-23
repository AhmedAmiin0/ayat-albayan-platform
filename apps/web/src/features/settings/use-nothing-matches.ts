import type { CustomConfigView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { customConfigQuery } from '@/features/custom-config/custom-api';
import { PAGE_SECTIONS } from './page-sections';

/** Does a non-empty search find nothing in any section of the page (a setting, the theme, lines, a template, a custom entry…)? */
export function nothingMatches(query: string, custom: readonly CustomConfigView[]): boolean {
  return query.trim() !== '' && !PAGE_SECTIONS.some((s) => s.matches(query, custom));
}

/** nothingMatches with the custom entries from GET /config/custom (none while it loads or fails). */
export function useNothingMatches(query: string): boolean {
  const custom = useQuery(customConfigQuery);
  return nothingMatches(query, custom.data ?? []);
}

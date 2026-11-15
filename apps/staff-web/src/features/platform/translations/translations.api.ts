import type { Locale, TranslationKeysPage } from '@ab/shared';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

export const TRANSLATIONS_PAGE_SIZE = 50;

export interface TranslationsSearch {
  search: string;
  section: string;
  page: number;
}

/** GET /i18n/keys: every key of the bundle with its defaults and overrides (admin). */
export const translationKeysQuery = (s: TranslationsSearch) =>
  queryOptions({
    queryKey: ['translations', s],
    queryFn: () => {
      const qs = new URLSearchParams([['page', String(s.page)], ['pageSize', String(TRANSLATIONS_PAGE_SIZE)]]);
      if (s.search.trim()) qs.set('search', s.search.trim());
      if (s.section) qs.set('section', s.section);
      return apiFetch<TranslationKeysPage>(`/i18n/keys?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export interface OverrideChange {
  locale: Locale;
  key: string;
  /** null = restore the bundled text (DELETE). */
  value: string | null;
}

const path = (c: OverrideChange) => `/i18n/${c.locale}/${encodeURIComponent(c.key)}`;

/** PUT / DELETE one locale's override, then refresh the list. */
export function useOverrideChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changes: readonly OverrideChange[]) => {
      for (const c of changes) await (c.value === null ? apiSend('DELETE', path(c)) : apiSend('PUT', path(c), { value: c.value }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['translations'] }),
  });
}

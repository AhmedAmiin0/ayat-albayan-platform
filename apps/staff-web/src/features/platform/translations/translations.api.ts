import { translationCalls } from '@ab/client-core';
import type { Locale } from '@ab/core';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { translationKeys } from '@/features/platform/keys';

export const TRANSLATIONS_PAGE_SIZE = 50;

export interface TranslationsSearch {
  search: string;
  section: string;
  page: number;
}

const translations = translationCalls({ apiFetch, apiSend });

const textOrNone = (text: string): string | undefined => text.trim() || undefined;

/** Every key of the bundle with its defaults and overrides (admin). */
export const translationKeysQuery = (s: TranslationsSearch) =>
  queryOptions({
    queryKey: translationKeys.list(s),
    queryFn: () =>
      translations.keys({
        page: s.page,
        pageSize: TRANSLATIONS_PAGE_SIZE,
        search: textOrNone(s.search),
        section: textOrNone(s.section),
      }),
    placeholderData: keepPreviousData,
  });

export interface OverrideChange {
  locale: Locale;
  key: string;
  /** null = restore the bundled text (DELETE). */
  value: string | null;
}

const sendChange = ({ value, ...key }: OverrideChange): Promise<undefined> =>
  value === null ? translations.restore(key) : translations.save(key, { value });

/** PUT / DELETE one locale's override, then refresh the list. */
export function useOverrideChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changes: readonly OverrideChange[]) => {
      for (const c of changes) await sendChange(c);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: translationKeys.all }),
  });
}

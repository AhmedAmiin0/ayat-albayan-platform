import { z } from 'zod';
import { LOCALES } from './locale.js';

// /i18n endpoints: the public overrides map and the admin «الترجمات» editor.

export const MAX_TRANSLATION_LENGTH = 2000;

export const translationLocaleSchema = z.enum(LOCALES);

/** PUT /i18n/:locale/:key body. */
export const translationValueSchema = z.object({
  value: z.string().trim().min(1).max(MAX_TRANSLATION_LENGTH),
});

/** GET /i18n/keys query. */
export const translationKeysQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  section: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type TranslationKeysQuery = z.output<typeof translationKeysQuerySchema>;

/** One row of the editor: the bundled defaults and the overrides (null = not overridden). */
export interface TranslationKeyRow {
  key: string;
  section: string;
  ar: string;
  en: string;
  arOverride: string | null;
  enOverride: string | null;
  /**
   * docs/26 §3: set only on a settings row's hint key (its Arabic text is that row's description,
   * edited on «القيم»): the settings key. The ar column is then read-only here (PUT/DELETE of the ar
   * override → 409 `edit_on_values`); en stays editable.
   */
  valuesKey?: string;
}

export interface TranslationKeysPage {
  items: TranslationKeyRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Every top-level section, for the filter. */
  sections: string[];
}

/** GET /i18n/:locale/overrides: dotted key → value. */
export type TranslationOverrides = Record<string, string>;

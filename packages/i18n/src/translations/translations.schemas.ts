import { z } from 'zod';
import { LOCALES, pageOf, pageQuery } from '@ab/core';

export const MAX_TRANSLATION_LENGTH = 2000;

export const translationLocaleSchema = z.enum(LOCALES);

export const translationKeyParamsSchema = z.object({
  locale: translationLocaleSchema,
  key: z.string(),
});
export type TranslationKeyParams = z.infer<typeof translationKeyParamsSchema>;

export const translationLocaleParamsSchema = translationKeyParamsSchema.pick({ locale: true });
export type TranslationLocaleParams = z.infer<typeof translationLocaleParamsSchema>;

export const translationValueSchema = z.object({
  value: z.string().trim().min(1).max(MAX_TRANSLATION_LENGTH),
});
export type TranslationValue = z.input<typeof translationValueSchema>;

export const translationKeysQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  section: z.string().trim().max(60).optional(),
  ...pageQuery({ size: 50 }),
});
export type TranslationKeysQuery = z.output<typeof translationKeysQuerySchema>;
export type TranslationKeysQueryInput = z.input<typeof translationKeysQuerySchema>;

/** One row of the editor: the bundled defaults and the overrides (null = not overridden). */
export const translationKeyRowSchema = z.object({
  key: z.string(),
  section: z.string(),
  ar: z.string(),
  en: z.string(),
  arOverride: z.string().nullable(),
  enOverride: z.string().nullable(),
  /**
   * Set only on a settings row's hint key, whose Arabic text is that row's description, edited on
   * the values page (docs/26 §3): the ar column is read-only here (409 `edit_on_values`).
   */
  valuesKey: z.string().optional(),
});
export type TranslationKeyRow = z.infer<typeof translationKeyRowSchema>;

/** One page of rows, with every top-level section for the filter. */
export const translationKeysPageSchema = pageOf(translationKeyRowSchema).extend({
  sections: z.array(z.string()),
});
export type TranslationKeysPage = z.infer<typeof translationKeysPageSchema>;

/** The public overrides map: dotted key → value. */
export const translationOverridesSchema = z.record(z.string(), z.string());
export type TranslationOverrides = z.infer<typeof translationOverridesSchema>;

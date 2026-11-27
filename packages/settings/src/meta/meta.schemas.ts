import { id, instant } from '@ab/core';
import { z } from 'zod';

/** Who last changed one settings row, and when. */
export const settingMetaSchema = z.object({
  updatedAt: instant,
  updatedBy: id().nullable(),
  updatedByName: z.string().nullable(),
});
export type SettingMeta = z.infer<typeof settingMetaSchema>;

/** One entry per stored settings row, by row key; a row never written has none. */
export const settingsMetaResponseSchema = z.object({
  meta: z.record(z.string(), settingMetaSchema),
});
export type SettingsMetaResponse = z.infer<typeof settingsMetaResponseSchema>;

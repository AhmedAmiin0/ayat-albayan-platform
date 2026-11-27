import { z } from 'zod';
import {
  SETTING_KEY_OF,
  SETTING_KEYS,
  SETTINGS_REGISTRY,
  type AcademySettings,
} from '../registry';
import { storedSettingZod } from '../validation/schema/schema';

const settingsShape = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, storedSettingZod(SETTINGS_REGISTRY[key])]),
);

/**
 * Every setting as GET /settings serves it, built from the registry's stored-value schemas. TS
 * cannot compute the type of a shape built in a loop; the tests pin it against the defaults.
 */
export const academySettingsSchema = z.object(settingsShape) as unknown as z.ZodType<
  AcademySettings,
  AcademySettings
>;

export const settingKeySchema = z.enum(SETTING_KEY_OF);

/** PATCH /settings answer: the settings after the write and what became of each sent field. */
export const settingsPatchResultSchema = z.intersection(
  academySettingsSchema,
  z.object({
    saved: z.array(settingKeySchema),
    moved: z.array(z.string()),
    invalid: z.array(settingKeySchema),
  }),
);
export type SettingsPatchResult = z.infer<typeof settingsPatchResultSchema>;

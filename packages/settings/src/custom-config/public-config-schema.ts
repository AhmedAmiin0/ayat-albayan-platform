import { z } from 'zod';
import { PUBLIC_SETTING_DEFAULTS, PUBLIC_SETTING_KEYS } from '../public';
import { SETTINGS_REGISTRY } from '../registry';
import { storedSettingZod } from '../validation/schema';
import type { PublicConfig } from './public-config';

// The apps' parse of GET /settings/public (docs/36 Z-5): each public key by its registry schema,
// a missing or bad value read as its default (as withPublicDefaults fills them), the public
// custom values kept as JSON.

const settingsShape = Object.fromEntries(
  PUBLIC_SETTING_KEYS.map((key) => [
    key,
    storedSettingZod(SETTINGS_REGISTRY[key]).catch(PUBLIC_SETTING_DEFAULTS[key]),
  ]),
);

/** The answer while nothing usable came back: the registry defaults, no custom values. */
const DEFAULT_ANSWER = { ...PUBLIC_SETTING_DEFAULTS, custom: {} };

const answerSchema = z
  .object({ ...settingsShape, custom: z.record(z.string(), z.json()).default({}).catch({}) })
  .catch(DEFAULT_ANSWER);

/**
 * GET /settings/public as the apps read it: one odd value reads as its default and a body that is
 * not an object as the defaults; only no body at all fails (the apps then keep the defaults too).
 */
export const publicConfigSchema = z
  .unknown()
  .refine((body) => body !== undefined)
  .pipe(answerSchema) as unknown as z.ZodType<PublicConfig>;

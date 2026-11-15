import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

/** The build env this file reads (rule 12: parsed, never trusted). */
const buildEnv = z.object({
  /** The EAS project @holdmycup/ayat-albayan-family: mobile.yml's `eas init` prints it. */
  FAMILY_EAS_PROJECT_ID: z.uuid().optional(),
  /** The family Firebase app's google-services.json (an EAS file env var of this project). */
  GOOGLE_SERVICES_JSON: z.string().min(1).optional(),
  /** Set by EAS on its build machines, which do not see the workflow's FAMILY_EAS_PROJECT_ID. */
  EAS_BUILD_PROJECT_ID: z.uuid().optional(),
});

/**
 * The owner's EAS project @holdmycup/ayat-albayan-family (owner 2026-11-15; a project id is not a
 * secret): every build and OTA has it without the env.
 */
const FAMILY_PROJECT_ID = 'ccc6c105-1f67-4b5e-ada5-c892bddaa95a';

/** The EAS project and its update URL. */
const easProject = (config: ExpoConfig, id: string): Partial<ExpoConfig> => ({
  extra: { ...config.extra, eas: { projectId: id } },
  updates: { ...config.updates, url: `https://u.expo.dev/${id}` },
});

/**
 * The family app (docs/50 §7): app.json is the source of truth; this adds what the build env
 * knows. No Firebase file without GOOGLE_SERVICES_JSON: registerPush then fails soft (no token,
 * no crash).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const env = buildEnv.parse(process.env);
  const base = config as ExpoConfig;
  const firebase = env.GOOGLE_SERVICES_JSON;
  const id = env.FAMILY_EAS_PROJECT_ID ?? env.EAS_BUILD_PROJECT_ID ?? FAMILY_PROJECT_ID;
  return {
    ...base,
    android: { ...base.android, ...(firebase ? { googleServicesFile: firebase } : {}) },
    ...easProject(base, id),
  };
};

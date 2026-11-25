import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

/** The build env this file reads (rule 12: parsed, never trusted). */
const envShape = z.object({
  /** The EAS project @holdmycup/ayat-albayan-family: mobile.yml's `eas init` prints it. */
  FAMILY_EAS_PROJECT_ID: z.uuid().optional(),
  /** The family Firebase app's google-services.json (an EAS file env var of this project). */
  GOOGLE_SERVICES_JSON: z.string().min(1).optional(),
  /** Set by EAS on its build machines, which do not see the workflow's FAMILY_EAS_PROJECT_ID. */
  EAS_BUILD_PROJECT_ID: z.uuid().optional(),
  /** «true» on EAS build machines only (never in `eas update`, lint or a runner). */
  EAS_BUILD: z.string().optional(),
  /** The eas.json profile EAS is building. */
  EAS_BUILD_PROFILE: z.string().optional(),
});

/** An EAS build of the Google Play bundle (eas.json `production`). */
const isStoreBuild = (env: z.infer<typeof envShape>): boolean =>
  env.EAS_BUILD === 'true' && env.EAS_BUILD_PROFILE === 'production';

/**
 * The store build must have push, so a production build without the
 * EAS production environment's GOOGLE_SERVICES_JSON fails here instead of shipping no FCM.
 */
const buildEnv = envShape.refine((env) => !isStoreBuild(env) || Boolean(env.GOOGLE_SERVICES_JSON), {
  message: 'add the file variable GOOGLE_SERVICES_JSON to the EAS environment production',
  path: ['GOOGLE_SERVICES_JSON'],
});

/**
 * The owner's EAS project @holdmycup/ayat-albayan-family (a project id is not a
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
 * knows. A preview without GOOGLE_SERVICES_JSON has no Firebase file (registerPush fails soft: no
 * token, no crash); the production build without it fails (buildEnv).
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

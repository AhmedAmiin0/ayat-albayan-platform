import Constants from 'expo-constants';
import { z } from 'zod';

// One codebase, two apps on the phone (docs/50 §7): the staff app and the family app
// (APP_VARIANT=family in app.config.ts writes `extra.appVariant`). Who may stay signed in, and the
// «wrongApp» notice, follow the app this bundle runs in.

export type AppKind = 'staff' | 'family';

/** The family build's `extra`: anything else (the staff app, a test) is the staff app. */
const familyExtra = z.object({ appVariant: z.literal('family') });

/** Which app this run is, from the build's config. */
export function appKind(): AppKind {
  return familyExtra.safeParse(Constants.expoConfig?.extra).success ? 'family' : 'staff';
}

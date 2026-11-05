import { shareRedirect } from '@/inbox';

/**
 * Every URL the system opens the app with, cold or warm (expo-router). An Android share arrives as
 * ayatalbayan://expo-sharing (expo-sharing and plugins/share-intent) and becomes /share; anything
 * else, the Stripe return included, is left as it came (docs/38 §mobile 1).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return shareRedirect(path);
}

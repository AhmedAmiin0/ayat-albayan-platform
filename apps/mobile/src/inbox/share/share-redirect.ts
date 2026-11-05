// docs/38 §mobile 1: expo-sharing turns an Android share (SEND / SEND_MULTIPLE) into the VIEW URL
// ayatalbayan://expo-sharing; app/+native-intent.ts hands every incoming URL to this function.

const SHARE_HOST = 'expo-sharing';

const hostOf = (path: string): string | null => {
  try {
    return new URL(path).hostname;
  } catch {
    return null;
  }
};

/** '/share' for the share URL; any other path (the Stripe return, a push link, garbage) unchanged. */
export function shareRedirect(path: string): string {
  return hostOf(path) === SHARE_HOST ? '/share' : path;
}

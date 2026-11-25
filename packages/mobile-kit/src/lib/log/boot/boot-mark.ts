import { mobileClientTag } from '../../http/client-tag';
import { logWarning } from '../log';

// Read when the kit loads: the staff entry (index.ts) imports the kit first, so this is the
// start of the JS boot. Monotonic clock: a wall-clock jump at boot cannot skew the number.
const loadedAt = performance.now();
let restoredChars: number | null = null;
let logged = false;

/** The persisted query cache as read on restore: only the first read is the restore. */
export function noteRestoredCache(value: string | null): void {
  restoredChars ??= value?.length ?? 0;
}

/**
 * The first screen is up: log the boot time and the restored cache size once per start, with the
 * build, so a week of device logs shows whether the one-value cache slows a cold start.
 */
export function reportFirstScreen(): void {
  if (logged) return;
  logged = true;
  const ms = Math.round(performance.now() - loadedAt);
  const cache = restoredChars === null ? 'not restored' : `${restoredChars} chars`;
  logWarning(`boot: first screen in ${ms} ms (cache=${cache}, ${mobileClientTag()})`);
}

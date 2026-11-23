import { reloadAsync } from 'expo-updates';
import { logWarning } from '../../lib/log/log';
import { clearQueryCaches } from '../../lib/query/query-client';

/**
 * The persisted cache may hold the data that crashed the screen, and its buster (the app version)
 * survives an OTA, so it is emptied before the reload. A build that cannot reload (development)
 * falls back to the router's retry, which re-renders the routes against the emptied cache.
 */
export async function restartAfterCrash(retry: () => Promise<void>): Promise<void> {
  await clearQueryCaches().catch(logWarning);
  await reloadAsync().catch(retry);
}

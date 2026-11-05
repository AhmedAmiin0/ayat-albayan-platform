import { connectivity } from '@/core/lib/connectivity/connectivity';
import { logWarning } from '@/core/lib/log';
import { mobileClientTag } from './client-tag';
import type { StallStage } from './read-deadline';

const logged = new Set<StallStage>();

/**
 * What the connection state hears per stage. A sent request with no answer (fetch) is one failure
 * (the connecting bar, the probe, then the reconnect refetch). A hung token refresh (token) is not
 * the API's: the /health probe would succeed, the reconnect refetch would re-run every query on the
 * same stuck refresh and the bar would flash for up to a minute. The read still fails, so the
 * screen keeps its saved copy with «آخر تحديث».
 */
const TELL_CONNECTIVITY: Readonly<Record<StallStage, () => void>> = {
  fetch: () => connectivity.reportFailure(),
  token: () => undefined,
};

/**
 * A read passed its deadline. Each stage is logged once per app run, with the build tag and no
 * request data: a device log tells a hung token refresh from a dead connection.
 */
export function reportStall(stage: StallStage): void {
  TELL_CONNECTIVITY[stage]();
  if (logged.has(stage)) return;
  logged.add(stage);
  const tag = mobileClientTag();
  logWarning(`read-deadline: no answer in time (stage=${stage}, ${tag})`);
}

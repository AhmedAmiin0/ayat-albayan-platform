import { connectivity } from '@/core/lib/connectivity/connectivity';
import { logWarning } from '@/core/lib/log';
import { mobileClientTag } from './client-tag';
import type { StallStage } from '@ab/client-core';

const logged = new Set<StallStage>();

/**
 * What the connection state hears per stage. A sent request with no answer (fetch) is one failure
 * (the connecting bar, the probe, then the reconnect refetch). A hung token refresh (token) is not
 * the API's own failure: reporting it would start the reconnect refetch, which re-runs every query
 * on the same stuck refresh while the bar flashes for up to a minute. It asks for one /health probe
 * instead: an answer changes nothing, no answer (a dead line, airplane mode) starts «connecting».
 * The read still fails either way, so the screen keeps its saved copy with «آخر تحديث».
 */
const TELL_CONNECTIVITY: Readonly<Record<StallStage, () => void>> = {
  fetch: () => connectivity.reportFailure(),
  token: () => connectivity.probeNow(),
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

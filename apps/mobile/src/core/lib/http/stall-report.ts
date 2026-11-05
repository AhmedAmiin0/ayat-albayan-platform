import { connectivity } from '@/core/lib/connectivity/connectivity';
import { logWarning } from '@/core/lib/log';
import { mobileClientTag } from './client-tag';
import type { StallStage } from './read-deadline';

const logged = new Set<StallStage>();

/**
 * A read passed its deadline: it got no answer, so the connection state hears one failure (the
 * connecting bar, the probe, then the reconnect refetch). Each stage is logged once per app run,
 * with the build tag and no request data: a device log tells a hung token refresh from a dead
 * connection.
 */
export function reportStall(stage: StallStage): void {
  connectivity.reportFailure();
  if (logged.has(stage)) return;
  logged.add(stage);
  const tag = mobileClientTag();
  logWarning(`read-deadline: no answer in time (stage=${stage}, ${tag})`);
}

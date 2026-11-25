import { connectivity } from '../connectivity/connectivity';
import { logWarning } from '../log/log';
import { mobileClientTag } from './client-tag';
import type { StallStage } from '@ab/client-core';

const logged = new Set<StallStage>();

/** A hung token refresh only asks for one /health probe; reporting it would loop refetches. */
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

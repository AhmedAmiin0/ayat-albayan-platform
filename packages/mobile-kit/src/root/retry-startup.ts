import { retryGate } from '../auth/gate-retry';
import { connectivity } from '../lib/connectivity/connectivity';
import { queryClient } from '../lib/query/query-client';
import { pathKey } from '../lib/query/query-keys';

/** Re-asks for the session, its role, /auth/me and the connection now. */
export function retryStartup() {
  retryGate();
  void queryClient.refetchQueries({ queryKey: pathKey('/auth/me') });
  connectivity.probeNow();
}

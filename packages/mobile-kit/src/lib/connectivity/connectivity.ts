import { onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { env } from '../http/env';
import { createConnectivity } from './connectivity-store';
import { probeApi } from './probe';

/**
 * The app's one connection state (R-MOB-03). apiFetch reports every answer and every request that got
 * none; while `connecting` TanStack is told it is offline and `/health` is probed with backoff.
 * Mocked in jest.setup.cjs (no probe loop in other tests); connectivity-store.test.ts tests the logic.
 */
export const connectivity = createConnectivity({
  probe: () => probeApi({ url: `${env.apiUrl}/health` }),
  setOnline: (online) => onlineManager.setOnline(online),
});

// 'inactive' (iOS control centre, a call banner) is neither: only a real background stops the probes.
AppState.addEventListener('change', (next) => {
  if (next === 'active') connectivity.setActive(true);
  else if (next === 'background') connectivity.setActive(false);
});

import { createContext, use } from 'react';
import type { GateStatus } from './use-auth-gate';

// The root layout's gate, shared with the screens below it (docs/38: /share). A second useAuthGate
// would start at 'booting' and ask /auth/me again.

const RootGateContext = createContext<GateStatus>('booting');

/** Set once by the root layout with its gate. */
export const RootGateProvider = RootGateContext.Provider;

/** The root layout's gate, no new listener or check ('booting' outside the root). */
export function useRootGate(): GateStatus {
  return use(RootGateContext);
}

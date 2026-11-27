import type { ReactNode } from 'react';
import type { GateStatus } from '../../auth/use-auth-gate';

export interface RootProvidersProps {
  gate: GateStatus;
  children: ReactNode;
}

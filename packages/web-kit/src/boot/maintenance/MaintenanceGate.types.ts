import type { ReactNode } from 'react';
import type { MaintenanceWatch } from './maintenance.types';

export interface MaintenanceGateProps extends MaintenanceWatch {
  children: ReactNode;
}

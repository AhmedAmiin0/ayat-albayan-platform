import type { ReactNode } from 'react';
import type { MaintenanceWatch } from '#/boot/maintenance/maintenance.types.ts';

export interface MaintenanceGateProps extends MaintenanceWatch {
  children: ReactNode;
}

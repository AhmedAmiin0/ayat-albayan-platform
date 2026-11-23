import type { ReactNode } from 'react';
import type { MaintenanceWatch } from '@ab/web-kit/boot/maintenance/maintenance.types';

export interface MaintenanceGateProps extends MaintenanceWatch {
  children: ReactNode;
}

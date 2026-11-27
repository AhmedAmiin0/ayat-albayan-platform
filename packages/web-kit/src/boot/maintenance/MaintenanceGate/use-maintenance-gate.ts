import type { MaintenanceWatch } from '@ab/web-kit/boot/maintenance/maintenance.types';
import { useMaintenance } from '@ab/web-kit/boot/maintenance/use-maintenance';

export function useMaintenanceGate(watch: MaintenanceWatch) {
  const { view, checking, retry } = useMaintenance(watch);
  const open = view === 'open';
  const kind = open ? null : view;
  return { open, kind, checking, retry };
}

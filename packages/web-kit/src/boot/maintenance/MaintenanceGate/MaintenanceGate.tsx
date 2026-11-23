import { MaintenanceScreen } from '#/components/shell/index.ts';
import type { MaintenanceGateProps } from './MaintenanceGate.types';
import { useMaintenance } from '#/boot/maintenance/use-maintenance.ts';

/**
 * The app always stays mounted (unsaved drafts survive); while covered it is inert (no focus, no
 * clicks, hidden from screen readers) and «تحت الصيانة» lies on top.
 */
export function MaintenanceGate({ children, ...watch }: MaintenanceGateProps) {
  const { view, checking, retry } = useMaintenance(watch);
  return (
    <>
      <div className="contents" inert={view !== 'open'}>
        {children}
      </div>
      {view === 'open' ? null : <MaintenanceScreen kind={view} checking={checking} onRetry={retry} />}
    </>
  );
}

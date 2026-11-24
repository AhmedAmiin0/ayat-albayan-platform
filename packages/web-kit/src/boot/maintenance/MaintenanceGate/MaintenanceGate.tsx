import { MaintenanceScreen } from '@ab/web-kit/components/shell';
import type { MaintenanceGateProps } from './MaintenanceGate.types';
import { useMaintenance } from '@ab/web-kit/boot/maintenance/use-maintenance';

/** The app stays mounted so unsaved drafts survive; while covered it is inert. */
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

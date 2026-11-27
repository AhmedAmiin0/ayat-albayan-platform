import { MaintenanceScreen } from '@ab/web-kit/components/shell';
import type { MaintenanceGateProps } from './MaintenanceGate.types';
import { useMaintenanceGate } from './use-maintenance-gate';

/** The app stays mounted so unsaved drafts survive; while covered it is inert. */
export function MaintenanceGate({ children, ...watch }: MaintenanceGateProps) {
  const { open, kind, checking, retry } = useMaintenanceGate(watch);
  return (
    <>
      <div className="contents" inert={!open}>
        {children}
      </div>
      {kind && <MaintenanceScreen kind={kind} checking={checking} onRetry={retry} />}
    </>
  );
}

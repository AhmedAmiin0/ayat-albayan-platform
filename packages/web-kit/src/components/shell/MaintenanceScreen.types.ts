/** The two covers (owner 2026-11-21): the admin's switch, or an API that stopped answering. */
export type MaintenanceCover = 'maintenance' | 'down';

export interface MaintenanceScreenProps {
  kind: MaintenanceCover;
  /** A check is running: the button says «جارٍ التحقق…». */
  checking: boolean;
  onRetry: () => void;
}

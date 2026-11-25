/** The two covers: the admin's switch, or an API that stopped answering. */
export type MaintenanceCover = 'maintenance' | 'down';

export interface MaintenanceScreenProps {
  kind: MaintenanceCover;
  checking: boolean;
  onRetry: () => void;
}

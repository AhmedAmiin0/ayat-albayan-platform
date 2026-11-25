/** The two covers: the admin's switch, or an API that stopped answering. */
export type MaintenanceCover = 'maintenance' | 'down';

export interface MaintenanceScreenProps {
  kind: MaintenanceCover;
  checking: boolean;
  onRetry: () => void;
  /** Noto Sans Arabic is registered (until then the system font: iOS errors on unknown ones). */
  fontsLoaded: boolean;
}

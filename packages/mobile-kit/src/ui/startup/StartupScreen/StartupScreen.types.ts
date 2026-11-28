import type { StartupMode } from '../startup-mode';

export interface StartupScreenProps {
  mode: StartupMode;
  onRetry: () => void;
  /** Noto Sans Arabic is registered (until then the system font: iOS errors on unknown ones). */
  fontsLoaded: boolean;
}

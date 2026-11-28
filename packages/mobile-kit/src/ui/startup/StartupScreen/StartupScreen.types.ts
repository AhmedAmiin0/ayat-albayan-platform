import type { StartupMode } from '../startup-mode';

export interface StartupScreenProps {
  mode: StartupMode;
  onRetry: () => void;
  /** Noto Sans Arabic is registered: before that the system Arabic font (an unknown family is an error on iOS). */
  fontsLoaded: boolean;
}

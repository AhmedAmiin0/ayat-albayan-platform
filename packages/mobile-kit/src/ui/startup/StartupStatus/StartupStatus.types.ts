import type { StartupStage } from '../startup-mode';

export interface StartupStatusProps {
  stage: StartupStage;
  still: boolean;
  onRetry: () => void;
  /** Maps a font family to undefined until the bundled fonts are registered. */
  font: (family: string) => string | undefined;
}

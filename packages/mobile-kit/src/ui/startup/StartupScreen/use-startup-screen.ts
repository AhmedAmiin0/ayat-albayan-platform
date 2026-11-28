import { useA11yPref } from '../../primitives/use-a11y-pref';
import { useStartupStage } from '../use-startup-stage';
import type { StartupScreenProps } from './StartupScreen.types';

export function useStartupScreen({
  mode,
  onRetry,
  fontsLoaded,
}: Pick<StartupScreenProps, 'mode' | 'onRetry' | 'fontsLoaded'>) {
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const still = useA11yPref('reduceMotion');
  const { stage, restart } = useStartupStage(mode);
  const retry = () => {
    restart();
    onRetry();
  };
  return { font, still, stage, retry };
}

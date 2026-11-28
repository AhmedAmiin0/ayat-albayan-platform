import { useA11yPref } from '../../primitives/use-a11y-pref';
import type { MaintenanceScreenProps } from './MaintenanceScreen.types';
import { S } from './maintenance-screen.helpers';

const WORDS = { maintenance: S.planned, down: S.outage } as const;
export function useMaintenanceScreen(props: MaintenanceScreenProps) {
  const { kind, checking, onRetry, fontsLoaded } = props;
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const still = useA11yPref('reduceMotion');
  const words = WORDS[kind];
  const outage = kind === 'down';
  return { checking, onRetry, font, still, words, outage };
}

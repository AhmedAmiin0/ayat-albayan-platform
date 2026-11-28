import { Switch } from '@expo/ui/jetpack-compose';
import { ExpoHost } from '../../surface/ExpoHost';
import { SwitchFrame } from './SwitchFrame';
import type { SwitchRowProps } from './SwitchRow.types';
import { useSwitchRow } from './use-switch-row';

/**
 * The settings switch row with Material 3's switch in the brand colours: React Native's Android
 * switch is the older AppCompat one, out of step with the system settings around it.
 */
export function SwitchRow(props: SwitchRowProps) {
  const control = useSwitchRow(props);
  return (
    <SwitchFrame
      label={props.label}
      testID={props.testID}
      note={props.children}
      control={
        <ExpoHost testID="switch-host">
          <Switch {...control} />
        </ExpoHost>
      }
    />
  );
}

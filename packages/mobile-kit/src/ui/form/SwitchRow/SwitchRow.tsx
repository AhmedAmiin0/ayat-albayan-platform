import { Switch } from 'react-native';
import { SwitchFrame } from './SwitchFrame';
import type { SwitchRowProps } from './SwitchRow.types';

/**
 * A settings switch row. iOS keeps React Native's switch: it already is the system UISwitch, so a
 * SwiftUI Toggle would look and work the same behind an extra host.
 */
export function SwitchRow({ label, value, disabled, onChange, testID, children }: SwitchRowProps) {
  return (
    <SwitchFrame
      label={label}
      testID={testID}
      note={children}
      control={
        <Switch
          accessibilityLabel={label}
          value={value}
          disabled={disabled}
          onValueChange={onChange}
        />
      }
    />
  );
}

import type { ReactNode } from 'react';
import { Switch, View } from 'react-native';
import { AppText } from '../../primitives/AppText';
import { type, useTheme } from '../../../theme';

interface SwitchRowProps {
  /** The row's words, also the switch's spoken name. */
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  testID?: string;
  /** Under the label and switch: a note or hint. */
  children?: ReactNode;
}

/** A 56pt settings row: the label, the system switch at the end, a note below. */
export function SwitchRow({ label, value, disabled, onChange, testID, children }: SwitchRowProps) {
  const ink = useTheme().color.ink;
  return (
    <View
      testID={testID}
      style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <AppText
          style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: ink }}
        >
          {label}
        </AppText>
        <Switch
          accessibilityLabel={label}
          value={value}
          disabled={disabled}
          onValueChange={onChange}
        />
      </View>
      {children}
    </View>
  );
}

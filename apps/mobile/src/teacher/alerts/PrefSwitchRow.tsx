import { Switch, View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

export interface PrefSwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const labelStyle = { flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm } as const;

/** One «تخصيص» switch: a 56pt row, the label at the start and the native switch at the end. */
export function PrefSwitchRow({ label, value, onChange }: PrefSwitchRowProps) {
  const { color } = useTheme();
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 16,
      }}
    >
      <AppText style={{ ...labelStyle, color: color.ink }}>
        {label}
      </AppText>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

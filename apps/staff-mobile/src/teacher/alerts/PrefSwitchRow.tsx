import { Switch, View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';

interface PrefSwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const labelStyle = { flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm } as const;

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

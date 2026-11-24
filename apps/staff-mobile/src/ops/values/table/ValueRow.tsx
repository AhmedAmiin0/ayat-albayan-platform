import { Pressable, View, type ViewStyle } from 'react-native';
import { t, type, useTheme, AppText, Chevron } from '@ab/mobile-kit';

interface ValueRowProps {
  label: string;
  value: string;
  editable: boolean;
  saving?: boolean;
  /** Opens the sheet. Without it the row is plain text (a value read from another page). */
  onPress?: () => void;
}

function rowName({ label, value, editable, saving }: Omit<ValueRowProps, 'onPress'>): string {
  const name = editable ? t.mobileValues.edit.replace('{label}', label).replace('{value}', value) : `${label}: ${value}`;
  return saving ? `${name}${t.common.listSeparator}${t.settingsValues.saving}` : name;
}

/** The whole row is the 44pt button. */
export function ValueRow(props: ValueRowProps) {
  const { label, value, saving, onPress } = props;
  const { color } = useTheme();
  const text = { fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) };
  const row = (pressed: boolean): ViewStyle => ({
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: pressed ? color.sunk : undefined,
  });
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ ...text, fontFamily: type.ui[500], color: color.ink }}>{label}</AppText>
        {saving ? (
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
            {t.settingsValues.saving}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexShrink: 1, maxWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <AppText
          numberOfLines={2}
          style={{ ...text, flexShrink: 1, fontFamily: type.ui[600], color: color.ink, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </AppText>
        {onPress ? <Chevron to="next" color={color.ink3} size={16} /> : null}
      </View>
    </>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={rowName(props)} style={row(false)}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rowName(props)}
      onPress={onPress}
      style={({ pressed }) => row(pressed)}
    >
      {body}
    </Pressable>
  );
}

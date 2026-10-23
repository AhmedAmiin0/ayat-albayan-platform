import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';

export interface ValueRowProps {
  label: string;
  value: string;
  /** settings.write and an editable scalar: the spoken name says «عدّل». */
  editable: boolean;
  onPress: () => void;
}

/** One row of the two-column table (الاسم | القيمة): the whole row is the 44pt+ button. */
export function ValueRow({ label, value, editable, onPress }: ValueRowProps) {
  const { color } = useTheme();
  const name = editable ? t.mobileValues.edit.replace('{label}', label).replace('{value}', value) : `${label}: ${value}`;
  const text = { fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <AppText style={{ ...text, flex: 1, fontFamily: type.ui[500], color: color.ink }}>{label}</AppText>
      <View style={{ flexShrink: 1, maxWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <AppText
          numberOfLines={2}
          style={{ ...text, flexShrink: 1, fontFamily: type.ui[600], color: color.ink, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </AppText>
        <Chevron to="next" color={color.ink3} size={16} />
      </View>
    </Pressable>
  );
}

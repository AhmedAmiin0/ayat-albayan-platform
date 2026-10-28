import { Pressable, TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface AyahStepperProps {
  /** «من الآية» / «إلى الآية»: the field's name, and the typed number's. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

interface StepProps {
  sign: string;
  /** «أنقص» / «زِد»; the hint names the field. */
  label: string;
  field: string;
  onPress: () => void;
  disabled?: boolean;
}

function Step({ sign, label, field, onPress, disabled }: StepProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={field}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={{
        width: 40,
        height: 40,
        borderRadius: shape.radius.md,
        backgroundColor: color.sunk,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <AppText
        style={{
          textAlign: 'center',
          fontFamily: type.ui[500],
          fontSize: type.size.h4,
          color: color.ink,
        }}
      >
        {sign}
      </AppText>
    </Pressable>
  );
}

/** − n +: one end of the ayah range; the number can also be typed (a long surah). */
export function AyahStepper({ label, value, onChange, disabled }: AyahStepperProps) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: shape.control.comfort,
          paddingHorizontal: 4,
          borderWidth: 1,
          borderColor: color.ruleInput,
          borderRadius: shape.radius.md,
        }}
      >
        <Step
          sign="−"
          label={t.reports.v2.picker.dec}
          field={label}
          onPress={() => onChange(value - 1)}
          disabled={disabled}
        />
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          editable={!disabled}
          value={String(value)}
          onChangeText={(text) => onChange(Number(text.replace(/\D/g, '')))}
          selectTextOnFocus
          style={{
            minWidth: 48,
            textAlign: 'center',
            fontFamily: type.ui[700],
            fontSize: type.size.lg,
            color: color.ink,
            fontVariant: ['tabular-nums'],
          }}
        />
        <Step
          sign="+"
          label={t.reports.v2.picker.inc}
          field={label}
          onPress={() => onChange(value + 1)}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

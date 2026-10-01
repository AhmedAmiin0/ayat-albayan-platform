import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Ltr } from '@/ui/Ltr';

export interface StepperProps {
  /** The step's name (t.pricing.studentsLabel…); also the buttons' hint for screen readers. */
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

interface StepButtonProps {
  glyph: '−' | '+';
  name: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}

function StepButton({ glyph, name, hint, disabled, onPress }: StepButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? color.lapisWash : color.raised,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.lg,
          color: color.lapis,
          textAlign: 'center',
        }}
      >
        {glyph}
      </AppText>
    </Pressable>
  );
}

/** − n + with 44pt targets (docs/07 §4), clamped to [min, max]. Western digits, LTR island. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <StepButton
        glyph="−"
        name={t.pricing.decrease}
        hint={label}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <Ltr
        accessibilityLabel={`${label}: ${value}`}
        style={{
          minWidth: 32,
          textAlign: 'center',
          fontFamily: type.ui[600],
          fontSize: type.size.lg,
          lineHeight: type.lineHeight(type.size.lg),
          color: color.ink,
        }}
      >
        {String(value)}
      </Ltr>
      <StepButton
        glyph="+"
        name={t.pricing.increase}
        hint={label}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}

import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { stepValue } from './step-value';

export interface StepperProps {
  /** The step's name (t.pricing.studentsLabel…); also the buttons' hint for screen readers. */
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Size of one step (default 1): 15 for minutes. */
  step?: number;
  /** Go round past an edge (a clock: 23 → 0) instead of stopping there. */
  wrap?: boolean;
  /** The readout (default the plain number): «14», «60 دقيقة». */
  format?: (value: number) => string;
  /** The buttons' own names (default «أقل» / «أكثر»). */
  names?: { less: string; more: string };
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

/** − n + with 44pt targets (docs/07 §4), clamped to [min, max] (or wrapping). Western digits, LTR island. */
export function Stepper({ label, value, min, max, onChange, ...o }: StepperProps) {
  const { color } = useTheme();
  const range = { min, max, step: o.step ?? 1, wrap: o.wrap === true };
  const shown = o.format ? o.format(value) : String(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <StepButton
        glyph="−"
        name={o.names?.less ?? t.pricing.decrease}
        hint={label}
        disabled={!range.wrap && value <= min}
        onPress={() => onChange(stepValue(value, -1, range))}
      />
      <Ltr
        accessibilityLabel={`${label}: ${shown}`}
        style={{
          minWidth: 32,
          textAlign: 'center',
          fontFamily: type.ui[600],
          fontSize: type.size.lg,
          lineHeight: type.lineHeight(type.size.lg),
          color: color.ink,
        }}
      >
        {shown}
      </Ltr>
      <StepButton
        glyph="+"
        name={o.names?.more ?? t.pricing.increase}
        hint={label}
        disabled={!range.wrap && value >= max}
        onPress={() => onChange(stepValue(value, 1, range))}
      />
    </View>
  );
}

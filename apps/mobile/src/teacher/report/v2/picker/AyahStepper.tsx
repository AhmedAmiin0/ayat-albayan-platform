import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface AyahStepperProps {
  /** «من الآية» / «إلى الآية»: the field's name, and the typed number's. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** The digits typed and not yet applied (null once applied), so «تمّ» can apply them. */
  onPending?: (text: string | null) => void;
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
export function AyahStepper({ label, value, onChange, onPending, disabled }: AyahStepperProps) {
  const { color } = useTheme();
  // What is typed, for the value it was typed over: a new value (a step, a clamp) shows itself.
  const [draft, setDraft] = useState({ base: value, text: String(value) });
  const text = draft.base === value ? draft.text : String(value);
  const setText = (next: string) => setDraft({ base: value, text: next });
  const typeText = (next: string) => {
    setText(next);
    onPending?.(next);
  };
  const apply = (next: number) => {
    onPending?.(null);
    onChange(next);
  };
  const commit = (typed: string) => {
    const digits = typed.replace(/\D/g, '');
    onPending?.(null);
    if (digits !== '' && Number(digits) !== value) onChange(Number(digits));
    setText(String(value));
  };
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
          onPress={() => apply(value - 1)}
          disabled={disabled}
        />
        {/* Typed digits apply when editing ends (or on «تمّ»), so «25» never passes through «2». */}
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          editable={!disabled}
          value={text}
          onChangeText={typeText}
          onEndEditing={() => commit(text)}
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
          onPress={() => apply(value + 1)}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

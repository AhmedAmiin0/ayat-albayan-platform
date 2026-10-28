import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

export interface ReportTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Required in the Google Form when the student attended: «*» and announced. */
  required?: boolean;
  /** The last send stopped on this blank required field: red label and border. */
  invalid?: boolean;
  /** Where useScrollToInvalid finds this question. */
  register?: (node: View | null) => void;
  /** Greyed example text while empty. */
  placeholder?: string;
  /** The column's limit (4000 for the long texts). */
  maxLength?: number;
}

/** A free-text question of the report (التسميع، الواجب، …): grows with the text, 4000 chars max. */
export function ReportTextField(p: ReportTextFieldProps) {
  const { label, value, onChange, disabled, required, invalid, register } = p;
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const shown = required ? `${label} *` : label;
  return (
    <View ref={(node) => register?.(node)} style={{ gap: 6 }}>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm, true),
          color: invalid ? color.bad : color.ink,
        }}
      >
        {shown}
      </AppText>
      <TextInput
        multiline
        maxLength={p.maxLength ?? 4000}
        placeholder={p.placeholder}
        placeholderTextColor={color.ink3}
        value={value}
        editable={!disabled}
        onChangeText={onChange}
        accessibilityLabel={label}
        accessibilityHint={required ? t.common.required : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: 72,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: invalid ? color.bad : focused ? color.lapis : color.ruleInput,
          borderRadius: shape.radius.md,
          backgroundColor: disabled ? color.sunk : color.raised,
          color: color.ink,
          fontFamily: type.ui[400],
          fontSize: type.size.base,
          lineHeight: type.lineHeight(type.size.base),
          // No textAlign or writingDirection: the field follows what is typed (Arabic or English).
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}

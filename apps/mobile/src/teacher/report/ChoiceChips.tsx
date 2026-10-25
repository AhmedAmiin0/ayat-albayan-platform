import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

export interface ChoiceChipsProps<V extends string> {
  /** The question, verbatim from the Google Form («الحضور», «التلاوة والنطق» …). */
  label: string;
  items: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
  /** The last submit stopped on this question. */
  invalid?: boolean;
  /** Marked «*» and announced as required, like the form's required questions. */
  required?: boolean;
  /** Where useScrollToInvalid finds this question. */
  register?: (node: View | null) => void;
}

/**
 * One multiple-choice question of «تقرير الحلقة» as wrapping radio chips (44pt): every option in
 * view at once, the chosen one in lapis. Disabled once the report can no longer be edited.
 */
export function ChoiceChips<V extends string>(p: ChoiceChipsProps<V>) {
  const { color } = useTheme();
  return (
    <View
      ref={(node) => p.register?.(node)}
      accessibilityRole="radiogroup"
      accessibilityLabel={p.label}
      accessibilityHint={p.required ? t.common.required : undefined}
      style={{ gap: 6 }}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm, true),
          color: p.invalid ? color.bad : color.ink,
        }}
      >
        {p.required ? `${p.label} *` : p.label}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {p.items.map((item) => {
          const on = item.value === p.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !!p.disabled }}
              disabled={p.disabled}
              onPress={() => p.onChange(item.value)}
              style={{
                minHeight: shape.control.touch,
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderRadius: shape.radius.md,
                borderWidth: 1,
                borderColor: on ? color.lapis : p.invalid ? color.bad : color.ruleInput,
                backgroundColor: on ? color.lapisWash : color.raised,
                opacity: p.disabled && !on ? 0.6 : 1,
              }}
            >
              <AppText
                style={{
                  fontFamily: type.ui[on ? 700 : 500],
                  fontSize: type.size.sm,
                  lineHeight: type.lineHeight(type.size.sm),
                  color: on ? color.ink : color.ink2,
                }}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

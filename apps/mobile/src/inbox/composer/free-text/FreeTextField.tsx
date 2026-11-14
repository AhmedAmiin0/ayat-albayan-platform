import { freeTextRoom, normaliseTemplateParam, type BodySlot } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

interface FreeTextFieldProps {
  /** The template's body: what is left of the 1024 characters for the text. */
  body: string;
  slot: BodySlot;
  value: string;
  onChange: (text: string) => void;
}

const c = t.inbox.composer;

/**
 * «نص الرسالة» (owner 2026-11-14: «a template that carries your text»): a multi-line box for a
 * template's free-text variable, with a live count of what will be sent (normalised: one line,
 * single spaces, Meta 132018) against the room the body leaves; past it, the sent text is cut.
 */
export function FreeTextField({ body, slot, value, onChange }: FreeTextFieldProps) {
  const { color } = useTheme();
  const max = freeTextRoom(body, slot);
  const count = normaliseTemplateParam(value).length;
  const over = count > max;
  const counter = c.freeTextCount.replace('{count}', String(count)).replace('{max}', String(max));
  const line = over ? c.freeTextOver.replace('{max}', String(max)) : counter;
  const small = { fontFamily: type.ui[500], fontSize: type.size['2xs'] };
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={c.freeText}
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChange}
      />
      <AppText style={{ ...small, color: color.ink3 }}>{c.freeTextHint}</AppText>
      <AppText
        accessibilityLiveRegion="polite"
        style={{ ...small, color: over ? color.bad : color.ink3 }}
      >
        {line}
      </AppText>
    </View>
  );
}

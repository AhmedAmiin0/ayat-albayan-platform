import { freeTextRoom, normaliseTemplateParam, type BodySlot } from '@ab/shared';
import { View } from 'react-native';
import { t, Field, AppText, type, useTheme } from '@ab/mobile-kit';

interface FreeTextFieldProps {
  /** The template's body: what is left of the 1024 characters for the text. */
  body: string;
  slot: BodySlot;
  value: string;
  onChange: (text: string) => void;
}

const c = t.inbox.composer;

/** The count uses Meta's normalised text (one line, single spaces, Meta 132018); excess is cut. */
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

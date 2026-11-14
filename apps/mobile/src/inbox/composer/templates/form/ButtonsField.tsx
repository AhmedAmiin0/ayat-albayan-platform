import { TEMPLATE_LIMITS, type TemplateEditButton } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Field } from '@/core/ui/form/Field';
import { Button } from '@/core/ui/primitives/Button';
import { Section } from '@/core/ui/surface/Section';
import type { SetDraft } from './use-template-draft';

interface ButtonsFieldProps {
  buttons: TemplateEditButton[];
  set: SetDraft;
  /** false = a code-bound template: the words of each button only, none added or removed. */
  reshape: boolean;
}

const retext = (list: readonly TemplateEditButton[], i: number, text: string) =>
  list.map((b, at) => (at === i ? { ...b, text } : b));

const REPLY: TemplateEditButton = { type: 'quick_reply', text: '' };

/** The buttons under the bubble: each one's words; quick replies added or removed up to three. */
export function ButtonsField({ buttons, set, reshape }: ButtonsFieldProps) {
  const room = reshape && buttons.length < TEMPLATE_LIMITS.buttons;
  const hint = t.templates.author.repliesHint.replace('{max}', String(TEMPLATE_LIMITS.buttons));
  return (
    <Section title={t.templates.author.replies}>
      {reshape ? <Note>{hint}</Note> : null}
      {buttons.map((b, i) => (
        <View key={i} style={{ gap: 6 }}>
          <Field
            label={t.templates.create.buttonText.replace('{n}', String(i + 1))}
            value={b.text}
            onChangeText={(text) => set({ buttons: retext(buttons, i, text) })}
            maxLength={TEMPLATE_LIMITS.buttonText}
            required
          />
          {reshape && b.type === 'quick_reply' ? (
            <Button
              variant="ghost"
              label={t.templates.create.remove}
              accessibilityLabel={t.templates.create.removeFor.replace('{n}', String(i + 1))}
              onPress={() => set({ buttons: buttons.filter((_, at) => at !== i) })}
            />
          ) : null}
        </View>
      ))}
      {room ? (
        <Button
          variant="secondary"
          label={t.templates.create.addReply}
          onPress={() => set({ buttons: [...buttons, REPLY] })}
        />
      ) : null}
    </Section>
  );
}

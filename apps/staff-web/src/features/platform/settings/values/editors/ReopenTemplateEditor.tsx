import { REOPEN_NO_TEMPLATE, reopenChoiceOf, type ReopenChoice } from '@ab/shared';
import { SETTING_FIELD_OF, settingDef } from '@ab/settings';
import { z } from 'zod';
import { Select, t } from '@ab/web-kit';
import { str } from '@/features/platform/settings/registry-form/settings-form';
import { useValues } from '@/features/platform/settings/values/values-context';
import { denseClass, describedBy, type EditorProps } from './editor-props';
import { TextEditor } from './TextEditor';

const choiceSchema = z.enum(['template', 'wait']);
const CHOICES = choiceSchema.options;

const VALUE_OF: Record<ReopenChoice, string> = {
  template: z.string().parse(settingDef('chat_reopen_template').default),
  wait: REOPEN_NO_TEMPLATE,
};

/** A choice between a welcome template or no template, waiting for the family's reply. */
export function ReopenTemplateEditor(props: EditorProps) {
  const api = useValues();
  const field = SETTING_FIELD_OF[props.settingKey];
  const choice = reopenChoiceOf(str(api.drafts.form(props.settingKey), field));
  const pick = (raw: string) =>
    api.drafts.edit(props.settingKey, { [field]: VALUE_OF[choiceSchema.parse(raw)] });
  return (
    <span className="grid gap-1">
      <Select
        aria-label={t.settings.chatReopenTemplate}
        aria-describedby={describedBy(api.error(props.settingKey) && props.ids.error)}
        disabled={api.status(props.settingKey).state === 'saving'}
        className={denseClass(props.sheet, 'w-[220px]')}
        value={choice}
        onChange={(e) => pick(e.target.value)}
      >
        {CHOICES.map((c) => (
          <option key={c} value={c}>
            {t.settingsValues.reopenChoice[c]}
          </option>
        ))}
      </Select>
      {choice === 'template' ? <TextEditor {...props} /> : null}
    </span>
  );
}

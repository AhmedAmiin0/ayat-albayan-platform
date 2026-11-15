import {
  REOPEN_NO_TEMPLATE,
  reopenChoiceOf,
  SETTING_FIELD_OF,
  settingDef,
  type ReopenChoice,
} from '@ab/shared';
import { z } from 'zod';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { str } from '@/features/platform/settings/registry-form/settings-form';
import { useValues } from '@/features/platform/settings/values/values-context';
import { denseClass, describedBy, type EditorProps } from './editor-props';
import { TextEditor } from './TextEditor';

const choiceSchema = z.enum(['template', 'wait']);
const CHOICES = choiceSchema.options;

/** The value a picked choice stores: the default starter template, or «بدون قالب». */
const VALUE_OF: Record<ReopenChoice, string> = {
  template: z.string().parse(settingDef('chat_reopen_template').default),
  wait: REOPEN_NO_TEMPLATE,
};

/**
 * `chat_reopen_template` (owner 2026-11-06, «give him a choice»): a select of «قالب ترحيب» (then
 * the template's name, today's text box) or «بدون قالب: انتظار رد العائلة» (REOPEN_NO_TEMPLATE).
 */
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

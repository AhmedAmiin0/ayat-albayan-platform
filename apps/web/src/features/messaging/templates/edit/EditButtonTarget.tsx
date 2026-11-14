import { CREATE_REPLY_INTENTS, QUICK_REPLY_INTENTS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { EditButton } from './edit-draft';

const S = t.templates.create;

interface TargetProps {
  i: number;
  button: EditButton;
  onChange: (next: EditButton) => void;
  bound: boolean;
}

/** Every action a quick reply may keep: none, the create form's, and the row's own. */
const intentChoices = (current: string): string[] =>
  [...new Set(['', ...CREATE_REPLY_INTENTS, current])];

/** A quick reply's action: none («رد عادي بلا إجراء») or one the webhook acts on. */
interface IntentSelectProps {
  id: string;
  value: string;
  disabled: boolean;
  onPick: (v: string) => void;
}

function IntentSelect(props: IntentSelectProps) {
  const names: Record<string, string | undefined> = { '': t.templates.edit.replyPlain, ...S.intents };
  return (
    <Select
      id={props.id}
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onPick(e.target.value)}
    >
      {intentChoices(props.value).map((v) => (
        <option key={v} value={v}>
          {names[v] ?? v}
        </option>
      ))}
    </Select>
  );
}

const intentOf = (v: string) => QUICK_REPLY_INTENTS.find((i) => i === v) ?? '';

/** A link's address, or what a quick reply does; both fixed on a code-bound template. */
export function EditButtonTarget({ i, button, onChange, bound }: TargetProps) {
  const label = (text: string) => text.replace('{n}', String(i + 1));
  if (button.type === 'url') {
    return (
      <Field label={label(S.buttonUrl)} hint={S.buttonUrlHint} required>
        {(p) => (
          <Input
            {...p}
            dir="ltr"
            type="url"
            readOnly={bound}
            value={button.url}
            onChange={(e) => onChange({ ...button, url: e.target.value })}
          />
        )}
      </Field>
    );
  }
  return (
    <Field label={label(S.buttonIntent)}>
      {(p) => (
        <IntentSelect
          id={p.id}
          value={button.intent}
          disabled={bound}
          onPick={(v) => onChange({ ...button, intent: intentOf(v) })}
        />
      )}
    </Field>
  );
}

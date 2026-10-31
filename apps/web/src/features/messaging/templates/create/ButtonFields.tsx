import { CREATE_REPLY_INTENTS, TEMPLATE_LIMITS } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { newButton, type DraftButton } from './template-draft';
import type { DraftFieldsProps } from './TemplateTextFields';

const S = t.templates.create;

interface RowProps {
  n: number;
  button: DraftButton;
  onChange: (next: DraftButton) => void;
  onRemove: () => void;
}

/** A link's address, or what a quick reply does when tapped. */
function ButtonTarget({ n, button, onChange }: Omit<RowProps, 'onRemove'>) {
  const label = (text: string) => text.replace('{n}', String(n));
  const intentOf = (value: string) => CREATE_REPLY_INTENTS.find((i) => i === value);
  if (button.type === 'url') {
    return (
      <Field label={label(S.buttonUrl)} hint={S.buttonUrlHint} required>
        {(p) => <Input {...p} dir="ltr" type="url" autoComplete="off" value={button.url} onChange={(e) => onChange({ ...button, url: e.target.value })} />}
      </Field>
    );
  }
  return (
    <Field label={label(S.buttonIntent)}>
      {(p) => (
        <Select
          {...p}
          value={button.intent}
          onChange={(e) => {
            onChange({ ...button, intent: intentOf(e.target.value) ?? button.intent });
          }}
        >
          {CREATE_REPLY_INTENTS.map((intent) => (
            <option key={intent} value={intent}>
              {S.intents[intent]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

function ButtonRow({ n, button, onChange, onRemove }: RowProps) {
  const label = (text: string) => text.replace('{n}', String(n));
  return (
    <div className="grid items-end gap-3 rounded-md border border-rule p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field label={label(S.buttonText)} required>
        {(p) => <Input {...p} dir="auto" maxLength={TEMPLATE_LIMITS.buttonText} value={button.text} onChange={(e) => onChange({ ...button, text: e.target.value })} />}
      </Field>
      <ButtonTarget n={n} button={button} onChange={onChange} />
      <Button type="button" size="sm" variant="ghost" aria-label={label(S.removeFor)} onClick={onRemove}>
        {S.remove}
      </Button>
    </div>
  );
}

/** Up to three buttons under the bubble, at most one link (the composers fill one {{1}} suffix). */
export function ButtonFields({ draft, set, error }: DraftFieldsProps) {
  const { buttons } = draft;
  const put = (list: DraftButton[]) => set({ buttons: list });
  const replace = (i: number) => (next: DraftButton) => {
    put(buttons.map((x, j) => (j === i ? next : x)));
  };
  const remove = (i: number) => () => put(buttons.filter((_, j) => j !== i));
  const full = buttons.length >= TEMPLATE_LIMITS.buttons;
  const hasUrl = buttons.some((b) => b.type === 'url');
  const refused = error('buttons');
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">{S.buttons}</legend>
      <p className="text-xs text-ink-3">{S.buttonsHint.replace('{max}', String(TEMPLATE_LIMITS.buttons))}</p>
      {refused && (
        <p role="alert" className="text-xs text-danger">
          {refused}
        </p>
      )}
      {buttons.map((b, i) => (
        // By position: Meta and the sender both address a button by its index.
        <ButtonRow key={i} n={i + 1} button={b} onChange={replace(i)} onRemove={remove(i)} />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={full || hasUrl} onClick={() => put([...buttons, newButton('url')])}>
          {S.addUrl}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={full} onClick={() => put([...buttons, newButton('quick_reply')])}>
          {S.addReply}
        </Button>
      </div>
    </fieldset>
  );
}

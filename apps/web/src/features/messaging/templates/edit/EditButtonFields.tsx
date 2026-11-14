import { TEMPLATE_LIMITS } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import type { EditButton } from './edit-draft';
import { EditButtonTarget } from './EditButtonTarget';

const S = t.templates.create;
const n = (text: string, i: number) => text.replace('{n}', String(i + 1));

export interface EditButtonFieldsProps {
  buttons: EditButton[];
  onChange: (buttons: EditButton[]) => void;
  /** Code-bound: the count, types, links and actions stay; only the words change. */
  bound: boolean;
  /** An author's template: plain quick replies only (no link, no action). */
  repliesOnly: boolean;
}

interface RowProps extends Omit<EditButtonFieldsProps, 'buttons' | 'onChange'> {
  i: number;
  button: EditButton;
  onChange: (next: EditButton) => void;
  onRemove: () => void;
}

function EditButtonRow({ i, button, onChange, onRemove, bound, repliesOnly }: RowProps) {
  return (
    <div className="grid items-end gap-3 rounded-md border border-rule p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field label={n(S.buttonText, i)} required>
        {(p) => (
          <Input
            {...p}
            dir="auto"
            maxLength={TEMPLATE_LIMITS.buttonText}
            value={button.text}
            onChange={(e) => onChange({ ...button, text: e.target.value })}
          />
        )}
      </Field>
      {!repliesOnly && <EditButtonTarget i={i} button={button} onChange={onChange} bound={bound} />}
      {!bound && (
        <Button type="button" size="sm" variant="ghost" aria-label={n(S.removeFor, i)} onClick={onRemove}>
          {S.remove}
        </Button>
      )}
    </div>
  );
}

const newRow = (type: EditButton['type']): EditButton =>
  type === 'url' ? { type, text: '', url: 'https://' } : { type, text: '', intent: '' };

/** The buttons under the bubble: words always; add / remove / links unless code-bound. */
export function EditButtonFields(props: EditButtonFieldsProps) {
  const { buttons, onChange, bound, repliesOnly } = props;
  const full = buttons.length >= TEMPLATE_LIMITS.buttons;
  const urls = buttons.filter((b) => b.type === 'url').length >= TEMPLATE_LIMITS.urlButtons;
  const add = (type: EditButton['type']) => onChange([...buttons, newRow(type)]);
  const put = (i: number) => (next: EditButton) =>
    onChange(buttons.map((b, j) => (j === i ? next : b)));
  const drop = (i: number) => () => onChange(buttons.filter((_, j) => j !== i));
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">{S.buttons}</legend>
      {buttons.map((b, i) => (
        // By position: Meta and the sender both address a button by its index.
        <EditButtonRow
          key={i}
          i={i}
          button={b}
          onChange={put(i)}
          onRemove={drop(i)}
          bound={bound}
          repliesOnly={repliesOnly}
        />
      ))}
      {!bound && (
        <div className="flex flex-wrap gap-2">
          {!repliesOnly && (
            <Button type="button" size="sm" variant="secondary" disabled={full || urls} onClick={() => add('url')}>
              {S.addUrl}
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" disabled={full} onClick={() => add('quick_reply')}>
            {S.addReply}
          </Button>
        </div>
      )}
    </fieldset>
  );
}

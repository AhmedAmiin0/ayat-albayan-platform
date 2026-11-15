import { freeTextRoom, normaliseTemplateParam, type BodySlot } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { controlClass } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

export interface FreeTextFieldProps {
  /** The template's body: what is left of the 1024 characters for the text. */
  body: string;
  slot: BodySlot;
  value: string;
  error?: string | undefined;
  onChange: (text: string) => void;
}

const c = t.inbox.composer;

/**
 * «نص الرسالة» (owner 2026-11-14: «a template that carries your text»): a multi-line box for a
 * template's free-text variable, with a live count of what will be sent (normalised: one line,
 * single spaces, Meta 132018) against the room the body leaves; past it, the sent text is cut.
 */
export function FreeTextField({ body, slot, value, error, onChange }: FreeTextFieldProps) {
  const max = freeTextRoom(body, slot);
  const count = normaliseTemplateParam(value).length;
  const over = count > max;
  const counter = c.freeTextCount.replace('{count}', String(count)).replace('{max}', String(max));
  return (
    <Field label={c.freeText} hint={c.freeTextHint} error={error}>
      {(p) => (
        <>
          <textarea
            {...p}
            dir="auto"
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(controlClass, 'field-sizing-content min-h-24 py-2 leading-relaxed')}
          />
          <p aria-live="polite" className={cn('text-xs', over ? 'text-danger' : 'text-ink-3')}>
            {over ? c.freeTextOver.replace('{max}', String(max)) : counter}
          </p>
        </>
      )}
    </Field>
  );
}

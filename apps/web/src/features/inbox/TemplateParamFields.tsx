import { renderTemplateBody, type TemplateView } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { paramFields, toParamsInput, urlButton, type ParamValues } from './template-params';

export interface TemplateParamFieldsProps {
  template: TemplateView;
  values: ParamValues;
  /** Slots to flag as required (after a send attempt). */
  missing: readonly string[];
  onChange: (next: ParamValues) => void;
}

/** {{1}}…{{3}} by their names, the meeting-link suffix, then the message as the guardian reads it. */
export function TemplateParamFields({ template: tpl, values, missing, onChange }: TemplateParamFieldsProps) {
  const url = urlButton(tpl);
  const error = (slot: string) => (missing.includes(slot) ? t.inbox.composer.required : undefined);
  const preview = renderTemplateBody(tpl.body_ar, toParamsInput(tpl, values));

  return (
    <>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {paramFields(tpl).map(({ slot, label }) => (
          <Field key={slot} label={label} error={error(slot)}>
            {(p) => <Input {...p} value={values[slot] ?? ''} onChange={(e) => onChange({ ...values, [slot]: e.target.value })} />}
          </Field>
        ))}
        {url && (
          <Field
            label={t.inbox.composer.button}
            hint={t.inbox.composer.buttonUrl.replace('{url}', url.replace('{{1}}', values.button?.trim() || '{{1}}'))}
            error={error('button')}
          >
            {(p) => (
              <Input {...p} dir="ltr" value={values.button ?? ''} onChange={(e) => onChange({ ...values, button: e.target.value })} />
            )}
          </Field>
        )}
      </div>
      <figure className="grid gap-1.5">
        <figcaption className="text-xs font-semibold text-ink-3">{t.inbox.composer.preview}</figcaption>
        <div className="max-w-[560px] rounded-lg bg-sunk px-3.5 py-2.5 text-sm whitespace-pre-wrap">
          <p>{preview}</p>
          {tpl.footer_ar && <p className="mt-1.5 text-2xs text-ink-3">{tpl.footer_ar}</p>}
        </div>
      </figure>
    </>
  );
}

import { renderTemplateBody, templateBlock, type TemplateView } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Ltr } from '@/components/ui/display/ltr';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n/i18n';
import { paramFields, toParamsInput, urlButton, type ParamValues } from '@/features/messaging/inbox/composer/lib/template-params';
import { TemplateButtons } from '@/features/messaging/inbox/messages/template/TemplateButtons';
import { TemplateFrame } from '@/features/messaging/inbox/messages/template/TemplateFrame';

export interface TemplateParamFieldsProps {
  template: TemplateView;
  values: ParamValues;
  /** Slots to flag as required (after a send attempt). */
  missing: readonly string[];
  onChange: (next: ParamValues) => void;
}

const c = t.inbox.composer;
const required = (label: string) => c.required.replace('{field}', label);

/**
 * {{1}}…{{3}} by their names, the meeting-link suffix, then the message as the guardian reads it.
 * A lesson time is read-only: it comes from the lesson picked above (rule 6).
 */
export function TemplateParamFields({ template: tpl, values, missing, onChange }: TemplateParamFieldsProps) {
  const url = urlButton(tpl);
  const params = toParamsInput(tpl, values);
  const preview = renderTemplateBody(tpl.body_ar, params);
  // As the family will see it in WhatsApp: header, body, grey footer, the buttons under it.
  const block = templateBlock(tpl, params);

  return (
    <>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {paramFields(tpl).map(({ slot, label, fromLesson }) => (
          <Field key={slot} label={label} error={missing.includes(slot) ? (fromLesson ? c.pickLesson : required(label)) : undefined}>
            {(p) => (
              <Input
                {...p}
                readOnly={fromLesson}
                value={values[slot] ?? ''}
                onChange={(e) => onChange({ ...values, [slot]: e.target.value })}
              />
            )}
          </Field>
        ))}
        {url && (
          <Field label={c.button} error={missing.includes('button') ? required(c.button) : undefined}>
            {(p) => (
              <>
                <Input {...p} dir="ltr" value={values.button ?? ''} onChange={(e) => onChange({ ...values, button: e.target.value })} />
                <p className="text-xs text-ink-3">
                  {c.buttonUrl.replace('{url}', '')}
                  <Ltr className="[overflow-wrap:anywhere]">{url.replace('{{1}}', values.button?.trim() || '{{1}}')}</Ltr>
                </p>
              </>
            )}
          </Field>
        )}
      </div>
      <figure className="grid gap-1.5">
        <figcaption className="text-xs font-semibold text-ink-3">{c.preview}</figcaption>
        <div
          className={cn(
            'max-w-[min(100%,560px)] min-w-[min(100%,260px)] justify-self-start overflow-hidden rounded-lg bg-sunk px-3.5 pt-2.5 text-sm',
            // The button rows reach the bubble's bottom edge, as in the chat.
            block.buttons.length === 0 && 'pb-2.5',
          )}
        >
          <TemplateFrame block={block} hasMedia={false}>
            <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              {preview}
            </p>
          </TemplateFrame>
          <TemplateButtons buttons={block.buttons} />
        </div>
      </figure>
    </>
  );
}

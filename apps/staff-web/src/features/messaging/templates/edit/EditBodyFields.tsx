import { TEMPLATE_LIMITS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { controlClass, Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

const S = t.templates.create;

export interface BodyFieldsProps {
  body: string;
  footer: string;
  onBody: (body: string) => void;
  onFooter: (footer: string) => void;
  /** The field's error text when the last save refused it (body, footer). */
  error: (field: string) => string | undefined;
}

/** The text and the footer: the words an edit may change ({{n}} only in the text). */
export function EditBodyFields({ body, footer, onBody, onFooter, error }: BodyFieldsProps) {
  const footerHint = S.footerHint.replace('{max}', String(TEMPLATE_LIMITS.footer));
  return (
    <div className="grid gap-4">
      <Field label={S.body} hint={S.bodyHint} required error={error('body')}>
        {(p) => (
          <textarea
            {...p}
            rows={5}
            dir="auto"
            value={body}
            maxLength={TEMPLATE_LIMITS.body}
            onChange={(e) => onBody(e.target.value)}
            className={cn(controlClass, 'min-h-28 resize-y py-2 leading-normal')}
          />
        )}
      </Field>
      <Field label={S.footer} hint={footerHint} error={error('footer')}>
        {(p) => (
          <Input
            {...p}
            dir="auto"
            maxLength={TEMPLATE_LIMITS.footer}
            value={footer}
            onChange={(e) => onFooter(e.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

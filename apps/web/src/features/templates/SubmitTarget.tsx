import type { TemplateLineView, WaLine } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { optionText } from '../integrations/integrations-form';

export interface SubmitTargetProps {
  line: WaLine;
  phone: string | undefined;
  /** The line's driver; undefined while its facts load. */
  provider: TemplateLineView['provider'] | undefined;
}

/**
 * «يُرسَل إلى»: the number a template is submitted from (owner 2026-10-18) — its line, its phone
 * (an LTR island, or «افحص الخطوط لعرض الرقم») and its driver, inside the submit dialog's list.
 */
export function SubmitTarget({ line, phone, provider }: SubmitTargetProps) {
  const fill = (part: string) =>
    part.replace('{line}', t.enums.waLine[line]).replace('{driver}', provider ? optionText(provider) : '—');
  const [before = '', after = ''] = t.templates.submitTargetValue.split('{phone}');
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold text-ink-3">{t.templates.submitTarget}</dt>
      <dd data-testid="submit-target">
        {fill(before)}
        {phone ? <Ltr>{phone}</Ltr> : t.templates.phoneUnknown}
        {fill(after)}
      </dd>
    </div>
  );
}

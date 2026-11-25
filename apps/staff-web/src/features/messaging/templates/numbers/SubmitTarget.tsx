import type { TemplateLineView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { Ltr, t } from '@ab/web-kit';
import { optionText } from '@/features/platform/integrations/integrations-form';

export interface SubmitTargetProps {
  line: WaLine;
  phone: string | undefined;
  /** The line's driver; undefined while its facts load. */
  provider: TemplateLineView['provider'] | undefined;
}

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

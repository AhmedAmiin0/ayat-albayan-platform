import { crmTemplateName, type TemplateView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { templateName } from '../template-cells';

/** A crm line's row (docs/19): the name the CRM gets (crm_name, else the default) and the button that edits it. */
export function CrmNameButton({ tpl, onEdit }: { tpl: TemplateView; onEdit: (tpl: TemplateView) => void }) {
  const s = t.templates.crmName;
  const [before, after = ''] = s.current.split('{crm}');
  return (
    <>
      <Button size="sm" variant="ghost" aria-label={s.editFor.replace('{name}', templateName(tpl.key))} onClick={() => onEdit(tpl)}>
        {s.edit}
      </Button>
      <span className="self-center text-2xs text-ink-3">
        {before}
        <Ltr className="break-all">{crmTemplateName(tpl)}</Ltr>
        {after}
      </span>
    </>
  );
}

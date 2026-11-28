import { crmTemplateName, type TemplateView } from '@ab/shared';
import { Button, Ltr, t } from '@ab/web-kit';
import { templateName } from '@/features/messaging/templates/template-cells';

/** A crm or meta line's row (docs/19): its WABA name (crm_name, else default) and edit button. */
export function CrmNameButton({
  tpl,
  onEdit,
}: {
  tpl: TemplateView;
  onEdit: (tpl: TemplateView) => void;
}) {
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

import type { TemplateLineView, TemplateView, WaLine } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import type { Notice } from '@/features/messaging/templates/use-template-actions';
import { t } from '@/lib/i18n/i18n';
import { CreateTemplateDialog } from './CreateTemplateDialog';

const S = t.templates.create;

interface NewTemplateProps {
  /** templates.manage: without it nothing shows. */
  manage: boolean;
  factsOf: (line: WaLine) => TemplateLineView | undefined;
  onNotice: (notice: Notice) => void;
  /** Opens the existing «إرسال إلى ميتا» confirm for the saved row. */
  onSubmit: (tpl: TemplateView) => void;
}

/**
 * «قالب جديد» (owner 2026-10-31) beside the section's title: the form, then (a meta / kapso number)
 * the new row's submit confirm. A crm number's template is made in the CRM, so no submit follows.
 */
export function NewTemplate({ manage, factsOf, onNotice, onSubmit }: NewTemplateProps) {
  const [open, setOpen] = useState(false);
  if (!manage) return null;
  const onCrm = (line: WaLine) => factsOf(line)?.provider === 'crm';
  const created = (tpl: TemplateView) => {
    setOpen(false);
    onNotice({ message: S.saved.replace('{name}', tpl.meta_name) });
    if (!onCrm(tpl.line)) onSubmit(tpl);
  };
  return (
    <>
      <Button size="sm" className="ms-auto" onClick={() => setOpen(true)}>
        {S.open}
      </Button>
      {open && <CreateTemplateDialog line="notifications" onCrm={onCrm} onCreated={created} onClose={() => setOpen(false)} />}
    </>
  );
}

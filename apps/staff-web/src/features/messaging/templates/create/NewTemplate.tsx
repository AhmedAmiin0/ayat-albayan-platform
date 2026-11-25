import type { TemplateLineView, TemplateView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { useState } from 'react';
import { Button, t } from '@ab/web-kit';
import type { Notice } from '@/features/messaging/templates/use-template-actions';
import { CreateTemplateDialog } from './CreateTemplateDialog';

const S = t.templates.create;

interface NewTemplateProps {
  /** templates.manage: without it nothing shows. */
  manage: boolean;
  factsOf: (line: WaLine) => TemplateLineView | undefined;
  onNotice: (notice: Notice) => void;
  onSubmit: (tpl: TemplateView) => void;
}

/** A crm number's template is submitted for review through the CRM (docs/39). */
export function NewTemplate({ manage, factsOf, onNotice, onSubmit }: NewTemplateProps) {
  const [open, setOpen] = useState(false);
  if (!manage) return null;
  const onCrm = (line: WaLine) => factsOf(line)?.provider === 'crm';
  const created = (tpl: TemplateView) => {
    setOpen(false);
    onNotice({ message: S.saved.replace('{name}', tpl.meta_name) });
    onSubmit(tpl);
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

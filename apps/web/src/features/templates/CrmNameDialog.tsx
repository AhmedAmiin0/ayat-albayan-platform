import { crmTemplateName, templateCrmNameSchema, type TemplateView } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { templateName } from './template-cells';

export interface CrmNameDialogProps {
  template: TemplateView;
  busy: boolean;
  onSave: (input: { key: string; crm_name: string | null; crm_language: string | null }) => void;
  onClose: () => void;
}

/**
 * «اسم القالب في نظام CRM» (docs/19): what the crm driver sends instead of the Meta name / language; blank =
 * the default (the old script's name, else the Meta name). report_ready explains its report_session switch.
 * Checked here with the API's own schema, so a bad value never leaves the form.
 */
export function CrmNameDialog({ template: tpl, busy, onSave, onClose }: CrmNameDialogProps) {
  const s = t.templates.crmName;
  const formId = useId();
  const [name, setName] = useState(tpl.crm_name ?? '');
  const [language, setLanguage] = useState(tpl.crm_language ?? '');
  const [invalid, setInvalid] = useState<{ name: boolean; language: boolean }>({ name: false, language: false });
  const fallback = crmTemplateName({ ...tpl, crm_name: null });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = templateCrmNameSchema.safeParse({ crm_name: name, crm_language: language });
    const bad = (field: string) => !parsed.success && parsed.error.issues.some((i) => i.path[0] === field);
    setInvalid({ name: bad('crm_name'), language: bad('crm_language') });
    if (parsed.success) onSave({ key: tpl.key, ...parsed.data });
  };
  return (
    <Dialog
      title={s.title}
      description={s.description.replace('{name}', templateName(tpl.key))}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <Field label={s.name} hint={s.nameHint.replace('{crm}', fallback)} error={invalid.name ? s.invalid : undefined}>
          {(p) => <Input {...p} dir="ltr" autoComplete="off" spellCheck={false} placeholder={fallback} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label={s.language} hint={s.languageHint.replace('{language}', tpl.language)} error={invalid.language ? s.invalid : undefined}>
          {(p) => <Input {...p} dir="ltr" autoComplete="off" spellCheck={false} placeholder={tpl.language} value={language} onChange={(e) => setLanguage(e.target.value)} />}
        </Field>
        {tpl.key === 'report_ready' && (
          <p role="note" className="border-s border-s-rule ps-3 text-sm text-ink-2">
            {s.reportNote}
          </p>
        )}
      </form>
    </Dialog>
  );
}

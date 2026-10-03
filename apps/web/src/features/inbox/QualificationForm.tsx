import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { patchQualification, type InboxLead } from './api';
import { RequestFields } from './FamilyFields';
import { PreferenceFields } from './PreferenceFields';
import { QualificationFields } from './QualificationFields';
import { qualForm, qualPatch, type QualErrors, type QualForm } from './qualification-form';

export interface QualificationFormProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

/**
 * «بيانات الطالب» in the thread (R-LEAD-03, issue A9): the questions the deleted form asked,
 * structured and optional. Saves only what changed (L1 merges; an emptied field is cleared).
 */
export function QualificationForm({ lead, onDone }: QualificationFormProps) {
  const queryClient = useQueryClient();
  const [initial, setInitial] = useState(() => qualForm(lead.qualification));
  const [form, setForm] = useState<QualForm>(initial);
  const [errors, setErrors] = useState<QualErrors>({});
  const save = useMutation({
    mutationFn: patchQualification,
    onSuccess: async () => {
      onDone(t.inbox.qualificationSaved);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: () => onDone(t.common.error, 'error'),
  });
  const change = (patch: Partial<QualForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const result = qualPatch(form, initial);
        if (!result.ok) return setErrors(result.errors);
        setErrors({});
        if (Object.keys(result.patch).length === 0) return;
        // The saved values become the baseline, so the next save sends only newer changes.
        save.mutate({ id: lead.id, patch: result.patch }, { onSuccess: () => setInitial(form) });
      }}
    >
      <h3 className="text-sm font-semibold">{t.leads.qualification}</h3>
      <QualificationFields form={form} errors={errors} onChange={change} />
      <PreferenceFields form={form} errors={errors} onChange={change} />
      <RequestFields form={form} errors={errors} onChange={change} />
      {/* Pinned to the bottom of the panel's scroll, so «حفظ» is in reach from any field. */}
      <div className="sticky bottom-0 -mx-1 border-t border-rule bg-page px-1 py-2">
        <Button type="submit" variant="secondary" disabled={save.isPending}>
          {save.isPending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  );
}

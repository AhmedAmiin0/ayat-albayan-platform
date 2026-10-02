import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { ErrorLine } from '../ErrorLine';
import { Heading } from './Heading';
import { PreferenceFields } from './PreferenceFields';
import { qualForm, qualPatch, type QualErrors, type QualForm } from './qualification-form';
import { QualificationFields } from './QualificationFields';
import type { QualificationPatch } from './qualification-schema';
import { saveErrorText, useLeadPatch, type LeadProfile } from './queries';

export interface QualificationFormProps {
  lead: LeadProfile;
  /** The lead's read got no answer: nothing can be saved until the network is back. */
  offline: boolean;
}

/**
 * «بيانات الطالب» (R-LEAD-03, L1), like the web's QualificationForm: the questions the deleted
 * Google Form asked, structured and optional. Saves only what changed (the API merges; an emptied
 * field is cleared). Offline the form stays readable, with no save button.
 */
export function QualificationForm({ lead, offline }: QualificationFormProps) {
  const save = useLeadPatch<QualificationPatch>('qualification');
  const [initial, setInitial] = useState(() => qualForm(lead.qualification));
  const [form, setForm] = useState<QualForm>(initial);
  const [errors, setErrors] = useState<QualErrors>({});
  const change = (patch: Partial<QualForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    // «اتحفظت» / the last failure belong to the values as they were saved, not to new edits.
    if (save.isSuccess || save.isError) save.reset();
  };
  const submit = () => {
    const result = qualPatch(form, initial);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    if (Object.keys(result.patch).length === 0) return;
    // The saved values become the baseline, so the next save sends only newer changes.
    save.mutate({ id: lead.id, body: result.patch }, { onSuccess: () => setInitial(form) });
  };

  return (
    <View style={{ gap: 14 }}>
      <Heading>{t.leads.qualification}</Heading>
      <QualificationFields form={form} errors={errors} onChange={change} />
      <PreferenceFields form={form} errors={errors} onChange={change} />
      {save.isError ? <ErrorLine message={saveErrorText(save.error)} /> : null}
      {save.isSuccess ? <Note>{t.inbox.qualificationSaved}</Note> : null}
      {offline ? null : (
        <Button
          variant="secondary"
          label={save.isPending ? t.common.saving : t.common.save}
          busy={save.isPending}
          onPress={submit}
        />
      )}
    </View>
  );
}

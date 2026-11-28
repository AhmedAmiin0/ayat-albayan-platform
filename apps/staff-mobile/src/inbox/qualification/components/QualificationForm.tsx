import type { LeadQualificationPatch } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { Heading } from './Heading';
import { PreferenceFields } from './PreferenceFields';
import {
  qualForm,
  qualPatch,
  type QualErrors,
  type QualForm,
} from '@/inbox/qualification/lib/qualification-form';
import { QualificationFields } from './QualificationFields';
import { saveErrorText, useLeadPatch, type LeadProfile } from '@/inbox/qualification/lib/queries';

export interface QualificationFormProps {
  lead: LeadProfile;
  /** The lead's read got no answer: nothing can be saved until the network is back. */
  offline: boolean;
}

/** R-LEAD-03: saves only changed fields (API merges, emptied fields clear); offline has no save. */
export function QualificationForm({ lead, offline }: QualificationFormProps) {
  const save = useLeadPatch<LeadQualificationPatch>('qualification');
  const [initial, setInitial] = useState(() => qualForm(lead.qualification));
  const [form, setForm] = useState<QualForm>(initial);
  const [errors, setErrors] = useState<QualErrors>({});
  const change = (patch: Partial<QualForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    // The saved or failed note belongs to the saved values, not to new edits.
    if (save.isSuccess || save.isError) save.reset();
  };
  const submit = () => {
    const result = qualPatch(form, initial);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
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

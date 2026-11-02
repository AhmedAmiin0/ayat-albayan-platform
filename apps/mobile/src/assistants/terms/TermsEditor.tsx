import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import type { AssistantRow } from '@/assistants/api/api';
import { CommissionFields } from '@/assistants/commission/CommissionFields';
import { assistantsErrorText } from '@/assistants/api/errors';
import { useSaveTerms } from '@/assistants/api/mutations';
import { SalaryFields } from './SalaryFields';
import { formOf, startMins, todayDay, toInput, type TermsErrors, type TermsForm } from './terms-form';

/**
 * The admin's terms of one salesperson (web TermsEditor, R-ASST-02/03): monthly salary and the
 * commission on a student's first fully paid subscription, checked with the API's own schema first.
 */
export function TermsEditor({ assistant, onNotice }: { assistant: AssistantRow; onNotice: (text: string) => void }) {
  const [form, setForm] = useState(() => formOf(assistant.terms));
  const [errors, setErrors] = useState<TermsErrors>({});
  const save = useSaveTerms();
  const rules = { current: assistant.terms, today: todayDay() };
  const mins = startMins(rules);
  const T = t.assistants.terms;
  const set = (patch: Partial<TermsForm>) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    const result = toInput(form, rules);
    setErrors('errors' in result ? result.errors : {});
    if ('value' in result) save.mutate({ assistantId: assistant.id, body: result.value }, { onSuccess: () => onNotice(t.mobileSalesMoney.done.terms) });
  };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <SalaryFields form={form} errors={errors} set={set} min={mins.salary} />
      <CommissionFields form={form} errors={errors} set={set} min={mins.commission} />
      <Note>{assistant.terms.renewal_share_percent > 0 ? T.hint.replace('{n}', String(assistant.terms.renewal_share_percent)) : T.hintRenewalOff}</Note>
      {save.isError ? <ErrorLine message={assistantsErrorText(save.error)} /> : null}
      <View>
        <Button label={save.isPending ? T.saving : T.save} busy={save.isPending} onPress={submit} />
      </View>
    </ScrollView>
  );
}

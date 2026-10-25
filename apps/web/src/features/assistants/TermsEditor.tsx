import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { paidAtDay } from '@/features/payments/pay-day';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANTS_KEY, saveTerms, type AssistantRow } from './api';
import { errorText } from './status';
import { TermsFields } from './TermsFields';
import { formOf, startMins, toInput, type TermsErrors, type TermsForm } from './terms-form';

/**
 * The admin's per-assistant terms (R-ASST-02, R-ASST-03): monthly salary and the commission on a
 * student's first fully paid subscription. Validated with the API's own schema before it is sent.
 */
export function TermsEditor({ assistant }: { assistant: AssistantRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formOf(assistant.terms));
  const [errors, setErrors] = useState<TermsErrors>({});
  const [saved, setSaved] = useState(false);
  const rules = { current: assistant.terms, today: paidAtDay() };
  const save = useMutation({
    mutationFn: saveTerms,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      setSaved(true);
    },
  });
  const set = (patch: Partial<TermsForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = toInput(form, rules);
    setErrors('errors' in result ? result.errors : {});
    if ('value' in result) save.mutate({ assistantId: assistant.id, body: result.value });
  };

  return (
    <form className="mb-8 grid max-w-3xl gap-6" onSubmit={submit} noValidate aria-label={t.assistants.terms.title}>
      <h2 className="font-display text-h4 font-bold">{t.assistants.terms.title}</h2>
      <TermsFields form={form} errors={errors} set={set} mins={startMins(rules)} />
      <p className="text-xs text-ink-3">{t.assistants.terms.hint}</p>
      {save.isError && <FormAlert>{errorText(save.error)}</FormAlert>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t.assistants.terms.saving : t.assistants.terms.save}
        </Button>
        {saved && <span role="status" className="text-sm text-ok">{t.assistants.terms.saved}</span>}
      </div>
    </form>
  );
}

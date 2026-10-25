import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { createSubscription, MONEY_KEY } from './api';
import { apiErrorText } from './format';
import { INITIAL_PRICING, pricingBody, todayIn, type PricingForm } from './pricing-form';
import { PricingFields } from './PricingFields';
import { QuotePreview } from './QuotePreview';
import { StudentPicker, type PickedStudent } from './StudentPicker';

type Props = {
  /** Preset from the student profile; otherwise the admin picks one. */
  student?: PickedStudent;
  /** The calculator's first inputs (a renewal starts from the last package); else the defaults. */
  initial?: PricingForm;
  onClose: () => void;
  onSaved: () => void;
};

/** «اشتراك جديد» (R-SUB-01): calculator inputs → the API's quote → saved at that price. */
export function CreateSubscriptionDialog({ student: preset, initial, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [student, setStudent] = useState<PickedStudent | null>(preset ?? null);
  const [form, setForm] = useState<PricingForm>(initial ?? INITIAL_PRICING);
  const [startsOn, setStartsOn] = useState(() => todayIn('Asia/Riyadh'));
  const [notes, setNotes] = useState('');
  const pricing = pricingBody(form);
  // One idempotency key per body: a retry after a 5xx / lost reply re-sends it and gets the first
  // package back; changing the child, price or day makes a new one (a different package).
  const request = useRef<{ body: string; id: string } | null>(null);

  const save = useMutation({
    mutationFn: createSubscription,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onSaved();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!student || !startsOn) return;
    const body = { studentId: student.id, pricing, startsOn, notes: notes.trim() || null };
    const key = JSON.stringify(body);
    if (request.current?.body !== key) request.current = { body: key, id: crypto.randomUUID() };
    save.mutate({ ...body, clientRequestId: request.current.id });
  };

  return (
    <Dialog
      title={t.subscriptions.new}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!student || save.isPending}>
            {save.isPending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        {student ? (
          <p className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="text-ink-3">{t.subscriptions.student}</span>
            <span className="font-semibold text-ink">{student.name}</span>
            <Ltr className="text-xs text-ink-3">{student.code ?? ''}</Ltr>
            {!preset && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStudent(null)}>
                {t.common.edit}
              </Button>
            )}
          </p>
        ) : (
          <StudentPicker onPick={setStudent} />
        )}
        <PricingFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        {student && <QuotePreview studentId={student.id} pricing={pricing} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.subscriptions.startsOn}>
            {(p) => <Input {...p} type="date" dir="ltr" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />}
          </Field>
          <Field label={t.subscriptions.notes}>
            {(p) => <Input {...p} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
        </div>
        {save.isError && <FormAlert>{apiErrorText(save.error, t.subscriptions.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

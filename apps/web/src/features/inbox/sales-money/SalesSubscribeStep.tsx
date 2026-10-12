import { DISCOUNTS, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { INITIAL_PRICING, pricingBody, todayIn, type PricingForm } from '@/features/subscriptions/pricing-form';
import { PricingFields } from '@/features/subscriptions/PricingFields';
import { t } from '@/lib/i18n';
import { createSalesSubscription, refreshAfterSalesWrite } from './api';
import { ChildPicker } from './ChildPicker';
import { salesErrorText } from './errors';
import { SalesQuotePreview } from './SalesQuotePreview';

type Props = {
  students: SalesFamilyStudent[];
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
};

/**
 * Step 1 «اشتراك جديد» (R-ASST-01): one of her students, the calculator's inputs, the API's quote and the
 * first day → POST /sales/subscriptions. One clientRequestId per body: a retry gets the first package back.
 */
export function SalesSubscribeStep({ students, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [studentId, setStudentId] = useState(() => (students.length === 1 ? (students[0]?.id ?? '') : ''));
  const [form, setForm] = useState<PricingForm>(INITIAL_PRICING);
  const [startsOn, setStartsOn] = useState(() => todayIn('Asia/Riyadh'));
  const pricing = pricingBody(form);
  const request = useRef<{ body: string; id: string } | null>(null);

  const save = useMutation({
    mutationFn: createSalesSubscription,
    onSuccess: async (sub) => {
      await refreshAfterSalesWrite(queryClient);
      onSaved(sub);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !startsOn || save.isPending) return;
    const body = { studentId, pricing, startsOn };
    const key = JSON.stringify(body);
    if (request.current?.body !== key) request.current = { body: key, id: crypto.randomUUID() };
    save.mutate({ ...body, clientRequestId: request.current.id });
  };

  return (
    <Dialog
      title={t.salesMoney.newSubscription}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!studentId || save.isPending}>
            {save.isPending ? t.salesMoney.saving : t.salesMoney.saveSubscription}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <ChildPicker students={students} value={studentId} onChange={setStudentId} />
        <PricingFields form={form} discounts={DISCOUNTS} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        {studentId && <SalesQuotePreview studentId={studentId} pricing={pricing} />}
        <Field label={t.salesMoney.startsOn}>
          {(p) => (
            <Input {...p} type="date" dir="ltr" className="max-w-[220px]" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
          )}
        </Field>
        {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

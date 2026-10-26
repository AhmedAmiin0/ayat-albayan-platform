import { DISCOUNTS, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { INITIAL_PRICING, pricingBody, todayIn, type PricingForm } from '@/features/finance/subscriptions/create/pricing-form';
import { PricingFields } from '@/features/finance/subscriptions/create/PricingFields';
import { t } from '@/lib/i18n/i18n';
import { createSalesSubscription, refreshAfterSalesWrite } from '../api';
import { ChildPicker } from './ChildPicker';
import { salesErrorText } from '../errors';
import { SalesQuotePreview } from './SalesQuotePreview';
import { SalesStartField, type StartValue } from './SalesStartField';
import { startBody } from './start-body';

type Props = {
  students: SalesFamilyStudent[];
  /** The student already picked (a renewal); else the only one, or none. */
  picked?: string | undefined;
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
};

/**
 * Step 1 «اشتراك جديد» (R-ASST-01): one of her students, the calculator's inputs, the API's quote and the
 * first day (only with subscriptions.set_start_date, else the API's default) → POST /sales/subscriptions.
 * One clientRequestId per body: a retry gets the first package back.
 */
export function SalesSubscribeStep({ students, picked, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [studentId, setStudentId] = useState(() => picked ?? (students.length === 1 ? (students[0]?.id ?? '') : ''));
  const [form, setForm] = useState<PricingForm>(INITIAL_PRICING);
  const canSet = usePermissions().can('subscriptions.set_start_date');
  const [today] = useState(() => todayIn('Asia/Riyadh'));
  const [start, setStart] = useState<StartValue>({ startsOn: today, alreadyStarted: false });
  const [startError, setStartError] = useState<string | null>(null);
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
    if (!studentId || save.isPending) return;
    const checked = startBody(start, { canSet, today });
    setStartError(checked.ok ? null : t.salesMoney.error[checked.code]);
    if (!checked.ok) return;
    const body = { studentId, pricing, ...checked.body };
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
        <SalesStartField canSet={canSet} today={today} value={start} onChange={(patch) => setStart((v) => ({ ...v, ...patch }))} error={startError} />
        {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

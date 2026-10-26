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
  /** «جدّد الاشتراك»: only her students due for a renewal, the calculator prefilled from the picked one's. */
  renew?: boolean | undefined;
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
};

/**
 * Step 1 «اشتراك جديد» (R-ASST-01): one of her students, the calculator's inputs, the API's quote and the
 * first day (only with subscriptions.set_start_date, else the API's default) → POST /sales/subscriptions.
 * One clientRequestId per body: a retry gets the first package back. A renewal (owner 2026-10-26) opens on
 * the student's last package (GET /sales/money/family `renewal`, the admin's renewalPricing); she may change
 * anything; the first day is the same default as any package (today, Riyadh), like the admin's renewal.
 */
export function SalesSubscribeStep({ students, picked, renew = false, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const choices = renew ? students.filter((s) => s.renew_due || s.id === picked) : students;
  const seedOf = (id: string): PricingForm => (renew ? students.find((s) => s.id === id)?.renewal : undefined) ?? INITIAL_PRICING;
  const [studentId, setStudentId] = useState(() => picked ?? (choices.length === 1 ? (choices[0]?.id ?? '') : ''));
  const [form, setForm] = useState<PricingForm>(() => seedOf(studentId));
  const pick = (id: string) => {
    setStudentId(id);
    if (renew) setForm(seedOf(id));
  };
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
      title={renew ? t.students.renew : t.salesMoney.newSubscription}
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
        <ChildPicker students={choices} value={studentId} onChange={pick} />
        <PricingFields form={form} discounts={DISCOUNTS} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        {studentId && <SalesQuotePreview studentId={studentId} pricing={pricing} />}
        <SalesStartField canSet={canSet} today={today} value={start} onChange={(patch) => setStart((v) => ({ ...v, ...patch }))} error={startError} />
        {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

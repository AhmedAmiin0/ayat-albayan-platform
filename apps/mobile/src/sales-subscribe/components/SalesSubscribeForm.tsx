import { chatBinding, RIYADH_TZ, type SalesFamilyStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { quoteLessons, renewalForm } from '@/subscribe';
import { PricingInputs } from '@/subscribe/PricingInputs';
import { INITIAL_FORM, pricingOf, startDays } from '@/subscribe/subscribe-form';
import { localDate } from '@/today/lib/timeline';
import { Button } from '@/core/ui/primitives/Button';
import { ChildPills } from './ChildPills';
import { SalesPriceSection } from './SalesPriceSection';
import { salesErrorText } from '../lib/sales-errors';
import { checkStart, type StartDraft } from '../lib/start-date';
import { StartDateField } from './StartDateField';
import { useSalesCreateSubscription, useSalesQuote } from '../hooks/use-sales-subscribe';

interface SalesSubscribeFormProps {
  phone: string;
  /** Her students of the family (at least one). */
  students: readonly SalesFamilyStudent[];
  /** Preselected from the route. */
  studentId?: string;
  /** «جدّد الاشتراك»: the form starts from the picked child's `renewal` (still editable), again on a new pick. */
  renew?: boolean;
}

/** The route's child, else the only one of hers, else none yet (''). */
const firstChild = (students: readonly SalesFamilyStudent[], first: string | undefined) =>
  first ?? (students.length === 1 ? (students[0]?.id ?? '') : '');

/**
 * The child, the admin's calculator inputs, the API's price, the first day (only with
 * subscriptions.set_start_date, StartDateField), «احفظ الاشتراك»; once saved, on to booking the
 * package's weekly days (owner 2026-10-18), then the family's transfer (the screen is replaced). The first
 * day of a renewal is the same default as any package (today, Riyadh), like the admin's renewal.
 */
export function SalesSubscribeForm({ phone, students, studentId: first, renew = false }: SalesSubscribeFormProps) {
  const [picked, setPicked] = useState(() => firstChild(students, first));
  const studentId = students.some((s) => s.id === picked) ? picked : '';
  const seedOf = (id: string) => {
    const seed = renew ? students.find((s) => s.id === id)?.renewal : undefined;
    return seed ? renewalForm(seed) : INITIAL_FORM;
  };
  const [form, setForm] = useState(() => seedOf(picked));
  const pick = (id: string) => {
    setPicked(id);
    if (renew) setForm(seedOf(id));
  };
  const [now] = useState(() => new Date());
  // The academy's (Riyadh) day everywhere: the API checks the start against it, whatever the family's zone.
  const academyToday = localDate(now, RIYADH_TZ);
  const canSet = useHolds('subscriptions.set_start_date');
  const [start, setStart] = useState<StartDraft>({ day: academyToday, alreadyStarted: false, past: academyToday, usedBefore: 0 });
  const [tried, setTried] = useState(false);
  const base = useTreeBase();
  const pricing = pricingOf(form);
  // A child not hers (sales.renew_any, docs/16 row 38): the chat's phone rides along; «أيام الحلقات» stays hers only.
  const bind = chatBinding(students, { studentId, phone });
  const quote = useSalesQuote(studentId, pricing, bind);
  const lessonsTotal = quoteLessons(quote.data);
  const starts = checkStart(start, { canSet, today: academyToday, lessonsTotal });
  const save = useSalesCreateSubscription(phone);
  const priced = studentId !== '' && quote.isSuccess && !quote.isPlaceholderData;
  const submit = () => {
    setTried(true);
    if (!starts.ok) return;
    save.mutate(
      { studentId, pricing, ...starts.body, ...bind },
      {
        onSuccess: (sub) =>
          router.replace(
            inTree(
              base,
              bind.phone
                ? { pathname: '/inbox/sales-transfer', params: { phone, subscriptionId: sub.id } }
                : { pathname: '/inbox/sales-course', params: { studentId, phone, subscriptionId: sub.id } },
            ),
          ),
      },
    );
  };

  return (
    <>
      <ChildPills students={students} value={studentId} onChange={pick} />
      <PricingInputs form={form} freeDiscount={false} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <SalesPriceSection quote={quote} />
      <StartDateField
        canSet={canSet}
        days={startDays(now, RIYADH_TZ)}
        academyToday={academyToday}
        draft={start}
        onChange={(patch) => setStart((d) => ({ ...d, ...patch }))}
        error={tried && !starts.ok ? starts.error : undefined}
        lessonsTotal={lessonsTotal}
      />
      {save.isError ? <ErrorLine message={salesErrorText(save.error)} /> : null}
      <Button
        label={save.isPending ? t.salesMoney.saving : t.salesMoney.saveSubscription}
        busy={save.isPending || save.isSuccess}
        disabled={!priced}
        onPress={submit}
      />
    </>
  );
}

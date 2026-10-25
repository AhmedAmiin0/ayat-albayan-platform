import { RIYADH_TZ, type SalesFamilyStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { PricingInputs } from '@/subscribe/PricingInputs';
import { INITIAL_FORM, pricingOf, startDays } from '@/subscribe/subscribe-form';
import { localDate } from '@/today/timeline';
import { Button } from '@/core/ui/primitives/Button';
import { ChildPills } from './ChildPills';
import { SalesPriceSection } from './SalesPriceSection';
import { salesErrorText } from './sales-errors';
import { checkStart, type StartDraft } from './start-date';
import { StartDateField } from './StartDateField';
import { useSalesCreateSubscription, useSalesQuote } from './use-sales-subscribe';

export interface SalesSubscribeFormProps {
  phone: string;
  /** Her students of the family (at least one). */
  students: readonly SalesFamilyStudent[];
  /** Preselected from the route. */
  studentId?: string;
}

/** The route's child, else the only one of hers, else none yet (''). */
const firstChild = (students: readonly SalesFamilyStudent[], first: string | undefined) =>
  first ?? (students.length === 1 ? (students[0]?.id ?? '') : '');

/**
 * The child, the admin's calculator inputs, the API's price, the first day (only with
 * subscriptions.set_start_date, StartDateField), «احفظ الاشتراك»; once saved, on to booking the
 * package's weekly days (owner 2026-10-18), then the family's transfer (the screen is replaced).
 */
export function SalesSubscribeForm({ phone, students, studentId: first }: SalesSubscribeFormProps) {
  const [picked, setPicked] = useState(() => firstChild(students, first));
  const studentId = students.some((s) => s.id === picked) ? picked : '';
  const [form, setForm] = useState(INITIAL_FORM);
  const [now] = useState(() => new Date());
  // The academy's (Riyadh) day everywhere: the API checks the start against it, whatever the family's zone.
  const academyToday = localDate(now, RIYADH_TZ);
  const canSet = useHolds('subscriptions.set_start_date');
  const [start, setStart] = useState<StartDraft>({ day: academyToday, alreadyStarted: false, past: academyToday });
  const [tried, setTried] = useState(false);
  const starts = checkStart(start, { canSet, today: academyToday });
  const base = useTreeBase();
  const pricing = pricingOf(form);
  const quote = useSalesQuote(studentId, pricing);
  const save = useSalesCreateSubscription(phone);
  const priced = studentId !== '' && quote.isSuccess && !quote.isPlaceholderData;
  const submit = () => {
    setTried(true);
    if (!starts.ok) return;
    save.mutate(
      { studentId, pricing, ...starts.body },
      {
        onSuccess: (sub) =>
          router.replace(
            inTree(base, { pathname: '/inbox/sales-course', params: { studentId, phone, subscriptionId: sub.id } }),
          ),
      },
    );
  };

  return (
    <>
      <ChildPills students={students} value={studentId} onChange={setPicked} />
      <PricingInputs form={form} freeDiscount={false} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <SalesPriceSection quote={quote} />
      <StartDateField
        canSet={canSet}
        days={startDays(now, RIYADH_TZ)}
        academyToday={academyToday}
        draft={start}
        onChange={(patch) => setStart((d) => ({ ...d, ...patch }))}
        error={tried && !starts.ok ? starts.error : undefined}
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

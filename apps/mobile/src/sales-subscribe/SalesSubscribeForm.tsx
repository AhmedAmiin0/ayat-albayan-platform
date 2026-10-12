import type { SalesFamilyStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { PricingInputs } from '@/subscribe/PricingInputs';
import { INITIAL_FORM, pricingOf, startDays } from '@/subscribe/subscribe-form';
import { StartDayPills } from '@/subscribe/SubscribeParts';
import { localDate } from '@/today/timeline';
import { Button } from '@/ui/Button';
import { ChildPills } from './ChildPills';
import { SalesPriceSection } from './SalesPriceSection';
import { salesErrorText } from './sales-errors';
import { useSalesCreateSubscription, useSalesQuote } from './use-sales-subscribe';

export interface SalesSubscribeFormProps {
  phone: string;
  /** The family's zone (the day chips). */
  tz: string;
  /** Her students of the family (at least one). */
  students: readonly SalesFamilyStudent[];
  /** Preselected from the route. */
  studentId?: string;
}

/** The route's child, else the only one of hers, else none yet (''). */
const firstChild = (students: readonly SalesFamilyStudent[], first: string | undefined) =>
  first ?? (students.length === 1 ? (students[0]?.id ?? '') : '');

/**
 * The child, the admin's calculator inputs, the API's price, the first day, «احفظ الاشتراك»; once
 * saved, on to recording the family's transfer for that package (the screen is replaced).
 */
export function SalesSubscribeForm({ phone, tz, students, studentId: first }: SalesSubscribeFormProps) {
  const [picked, setPicked] = useState(() => firstChild(students, first));
  const studentId = students.some((s) => s.id === picked) ? picked : '';
  const [form, setForm] = useState(INITIAL_FORM);
  const [now] = useState(() => new Date());
  const today = localDate(now, tz);
  const [day, setDay] = useState(today);
  const pricing = pricingOf(form);
  const quote = useSalesQuote(studentId, pricing);
  const save = useSalesCreateSubscription(phone);
  const priced = studentId !== '' && quote.isSuccess && !quote.isPlaceholderData;
  const submit = () =>
    save.mutate(
      { studentId, pricing, startsOn: day },
      {
        onSuccess: (sub) =>
          router.replace({ pathname: '/inbox/sales-transfer', params: { phone, subscriptionId: sub.id } }),
      },
    );

  return (
    <>
      <ChildPills students={students} value={studentId} onChange={setPicked} />
      <PricingInputs form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <SalesPriceSection quote={quote} />
      <StartDayPills days={startDays(now, tz)} today={today} value={day} onChange={setDay} />
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

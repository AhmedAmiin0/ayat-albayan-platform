import { chatBinding, RIYADH_TZ, type SalesFamilyStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { quoteLessons, renewalForm } from '@/subscribe';
import { PricingInputs } from '@/subscribe/PricingInputs';
import { INITIAL_FORM, pricingOf, startDays } from '@/subscribe/subscribe-form';
import { localDate } from '@/today';
import { Button } from '@/core/ui/primitives/Button';
import { ChildPills } from './ChildPills';
import { PayMethodPills, type PayMethod } from './PayMethodPills';
import { SalesPriceSection } from './SalesPriceSection';
import { salesErrorText } from '@/sales-subscribe/lib/sales-errors';
import { checkStart, type StartDraft } from '@/sales-subscribe/lib/start-date';
import { StartDateField } from './StartDateField';
import { SalesTeacherPills, useTeacherPick } from './SalesTeacherPills';
import { useSalesCreateSubscription, useSalesQuote } from '@/sales-subscribe/hooks/use-sales-subscribe';
import { LinkCreated } from '@/sales-subscribe/payment-link/LinkCreated';
import { linkErrorText } from '@/sales-subscribe/payment-link/link-text';
import { OnlinePrice } from '@/sales-subscribe/payment-link/OnlinePrice';
import { useLinkPay } from '@/sales-subscribe/payment-link/use-link-pay';
import { useStripeOn } from '@/sales-subscribe/payment-link/use-stripe';

interface SalesSubscribeFormProps {
  phone: string;
  /** Her students of the family (at least one). */
  students: readonly SalesFamilyStudent[];
  /** The picked child, '' = none yet; the screen holds it (its title follows the child). */
  studentId: string;
  onPick: (id: string) => void;
  /** «جدّد الاشتراك»: a child due for one starts from its `renewal` (still editable), again on a new pick. */
  renew?: boolean;
  /** Back to the chat once a payment link's text is in its box. */
  onDone: () => void;
}

const pl = t.paymentLinks;

/**
 * The child, the admin's calculator inputs, the API's price, the first day (only with subscriptions.set_start_date),
 * «المعلم/ة» (the trial's unless she picks another; teacherId). «طريقة الدفع» (owner 2026-10-29) where both exist:
 * «تحويل بنكي» saves the package (on to its weekly days, then the transfer; the screen is replaced), «دفع إلكتروني»
 * (the Stripe test build, her own child) makes a link from the same fields: the agreed amount, then the link to send.
 */
export function SalesSubscribeForm({ phone, students, studentId, onPick, renew = false, onDone }: SalesSubscribeFormProps) {
  const child = students.find((s) => s.id === studentId);
  // A single «جدّد الاشتراك» lists all her children: only one due starts from its last package.
  const seedOf = (id: string) => {
    const s = renew ? students.find((x) => x.id === id) : undefined;
    return s?.renew_due ? renewalForm(s.renewal) : INITIAL_FORM;
  };
  const [form, setForm] = useState(() => seedOf(studentId));
  const teacher = useTeacherPick(students, studentId);
  const pick = (id: string) => {
    onPick(id);
    if (renew) setForm(seedOf(id));
  };
  const [now] = useState(() => new Date());
  // The academy's (Riyadh) day everywhere: the API checks the start against it, whatever the family's zone.
  // academy day (docs/34 b): a subscription starts on an academy day.
  const academyToday = localDate(now, RIYADH_TZ);
  const canSet = useHolds('subscriptions.set_start_date');
  const [start, setStart] = useState<StartDraft>({ day: academyToday, alreadyStarted: false, past: academyToday, usedBefore: 0 });
  const [tried, setTried] = useState(false);
  const base = useTreeBase();
  const pricing = pricingOf(form);
  // A child not hers (sales.renew_any, docs/16 row 38): the chat's phone rides along; the payment link stays hers.
  const bind = chatBinding(students, { studentId, phone });
  const quote = useSalesQuote(studentId, pricing, bind);
  const lessonsTotal = quoteLessons(quote.data);
  const starts = checkStart(start, { canSet, today: academyToday, lessonsTotal });
  const save = useSalesCreateSubscription(phone);
  const priced = studentId !== '' && quote.isSuccess && !quote.isPlaceholderData;
  const stripe = useStripeOn();
  const canOnline = stripe && child !== undefined && child.mine !== false;
  const [method, setMethod] = useState<PayMethod>('bank');
  const online = canOnline && method === 'online';
  const pay = useLinkPay({ studentId: online ? studentId : '', pricing, phone });
  if (pay.link) return <LinkCreated link={pay.link} phone={phone} onSent={onDone} />;
  const submit = () => {
    setTried(true);
    if (!starts.ok) return;
    // The link never carries the chat's phone: online is for her own children only.
    if (online) pay.submit({ ...starts.body, ...teacher.body });
    else save.mutate(
      { studentId, pricing, ...starts.body, ...teacher.body, ...bind },
      {
        // Its weekly days next, then the transfer; a child not hers too (owner 2026-11-01).
        onSuccess: (sub) =>
          router.replace(inTree(base, { pathname: '/inbox/sales-course', params: { studentId, phone, subscriptionId: sub.id } })),
      },
    );
  };
  const busy = online ? pay.create.isPending : save.isPending;
  const failed = online ? pay.create.error : save.error;

  return (
    <>
      <ChildPills students={students} value={studentId} onChange={pick} />
      <PricingInputs form={form} freeDiscount={false} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      {canOnline ? <PayMethodPills value={method} onChange={setMethod} /> : null}
      {online ? <OnlinePrice pay={pay} /> : <SalesPriceSection quote={quote} />}
      <SalesTeacherPills hidden={studentId === ''} value={teacher.teacherId} onChange={teacher.setTeacher} />
      <StartDateField
        canSet={canSet}
        days={startDays(now, RIYADH_TZ)}
        academyToday={academyToday}
        draft={start}
        onChange={(patch) => setStart((d) => ({ ...d, ...patch }))}
        error={tried && !starts.ok ? starts.error : undefined}
        lessonsTotal={lessonsTotal}
      />
      {failed ? <ErrorLine message={online ? linkErrorText(failed, salesErrorText(failed)) : salesErrorText(failed)} /> : null}
      <Button
        label={online ? (busy ? pl.creating : pl.create) : busy ? t.salesMoney.saving : t.salesMoney.saveSubscription}
        busy={busy || (!online && save.isSuccess)}
        disabled={online ? !pay.priced : !priced}
        onPress={submit}
      />
    </>
  );
}

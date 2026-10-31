import { canLinkFamily, canPickTrialDate, type SalesFamilyStudent, type SalesStudentRef, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Toast } from '@/components/ui/overlay/toast';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { RegistrationCheckTrigger } from '@/features/sales/sales/registration/RegistrationCheckButton';
import { RegistrationCheckDialog } from '@/features/sales/sales/registration/RegistrationCheckDialog';
import { TrialDateDialog } from '@/features/teaching/booking/trial-date/dialog/TrialDateDialog';
import { t } from '@/lib/i18n/i18n';
import { LinkFamilyDialog } from '@/features/messaging/inbox';
import { useInboxMode } from '@/features/messaging/inbox';
import { SalesRegisterButton, SalesRegisterDialog } from '@/features/messaging/inbox';
import { canRegisterFrom } from '@/features/messaging/inbox';
import { salesFamilyQuery } from './api';
import { ChildChoiceDialog } from './ChildChoiceDialog';
import { SalesCourseDialog } from './course/SalesCourseDialog';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';
import { SalesPrimaryAction } from './SalesPrimaryAction';
import { hasCourse } from './SalesSubscribeAction';

type Opened = { start: FlowStart; studentId?: string; renew?: boolean };
type Choice = 'course' | 'trial';
type LeadThread = ThreadView & { lead_id: string };

export interface SalesFamilyActions {
  /** The one visible action: «تسجيل طالب جديد» on a lead, «جدّد الاشتراك» / «اشتراك جديد» on a family of hers. */
  primary: ReactNode;
  /** The «المزيد» entries, in order; empty = no menu. */
  items: ReactNode[];
  /** Every dialog (register, check, money, course), rendered outside the menu (they portal). */
  dialogs: ReactNode;
}

/**
 * The sales chat's header actions (R-ASST-01/04, W3), split into one visible action and the rest.
 * Family (GET /sales/money/family, her students only): «جدّد الاشتراك» is the visible action while one
 * of them is `renew_due` (owner 2026-10-26: one tap, prefilled from `renewal`; several due → the step
 * picks among them), «اشتراك جديد» then moves to the menu; «سجّل تحويلًا بنكيًا» while a package is owed. No
 * child is named on any action (owner 2026-10-29): ONE «أيام الحلقات» (hasCourse) and ONE «موعد تجريبي جديد»
 * (canPickTrialDate, with the trial dates' history in its dialog), with several children ChildChoiceDialog
 * picks one first. The payment method (a Stripe link in the test build) is chosen inside «اشتراك جديد».
 * «تحقق من التسجيل» (students.check_registration) always goes in the menu; «ربط بطالب موجود» (leads.link_family) on a
 * lead chat with no family (canLinkFamily), its done text a toast here. `compact` (phones):
 * the visible action is an icon button. Outside sales mode everything is empty. Every dialog's open
 * state lives here, so SalesChatFrame keeps them open across 900px (m13; round 2 B: the lead's
 * «تسجيل طالب جديد», which keeps the lead thread it was opened on, and the registration check).
 */
export function useSalesFamilyActions({ thread, compact = false }: { thread: ThreadView; compact?: boolean }): SalesFamilyActions {
  const mode = useInboxMode();
  const sales = mode === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  const { can } = usePermissions();
  const check = can('students.check_registration');
  const [opened, setOpened] = useState<Opened | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const [registering, setRegistering] = useState<LeadThread | null>(null);
  const [checking, setChecking] = useState(false);
  const [trialFor, setTrialFor] = useState<SalesStudentRef | null>(null);
  const [choosing, setChoosing] = useState<Choice | null>(null);
  const [linkingFamily, setLinkingFamily] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const linkDone = (text: string) => {
    setLinkingFamily(null);
    setLinked(text);
  };
  if (mode !== 'sales') return { primary: null, items: [], dialogs: null };
  const students = sales ? (family.data?.students ?? []) : [];
  // sales.renew_any (docs/16 row 38) also lists children not hers (`mine: false`): money only, the rest stays hers.
  const own = students.filter((s) => s.mine !== false);
  // «موعد تجريبي جديد» (owner 2026-10-25): her students without a running subscription only.
  const choices: Record<Choice, { title: string; list: SalesFamilyStudent[]; open: (s: SalesFamilyStudent) => void }> = {
    course: { title: t.booking.courseDays, list: own.filter(hasCourse), open: (s) => setCourse(s.id) },
    trial: { title: t.trialDate.action, list: own.filter((s) => canPickTrialDate(s.status)), open: (s) => setTrialFor({ id: s.id, name: s.name, code: s.code }) },
  };
  const chosen = choosing ? choices[choosing] : null;
  const pickChild = (s: SalesFamilyStudent) => {
    setChoosing(null);
    chosen?.open(s);
  };
  const checkItem = check ? [<RegistrationCheckTrigger key="check" onClick={() => setChecking(true)} />] : [];
  // One shape for the lead and the family alike: booking a lead makes it a family on the next poll,
  // and a moved slot would re-mount the open «تسجيل طالب جديد» (its «تم الحجز» lost, journey 7).
  const dialogs = (
    <>
      {registering && <SalesRegisterDialog thread={registering} onClose={() => setRegistering(null)} />}
      {checking && <RegistrationCheckDialog phone={thread.phone_e164} onClose={() => setChecking(false)} />}
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
      {trialFor && <TrialDateDialog mode="sales" student={trialFor} onClose={() => setTrialFor(null)} />}
      {opened && (
        <SalesMoneyFlow {...opened} students={students} phone={thread.phone_e164} sessionOpen={thread.session_open} onClose={() => setOpened(null)} />
      )}
      {chosen && <ChildChoiceDialog title={chosen.title} students={chosen.list} onPick={pickChild} onClose={() => setChoosing(null)} />}
      {linkingFamily && (
        <LinkFamilyDialog leadId={linkingFamily} phone={thread.phone_e164} onClose={() => setLinkingFamily(null)} onDone={linkDone} />
      )}
      {linked && <Toast message={linked} onDismiss={() => setLinked(null)} />}
    </>
  );
  if (students.length === 0) {
    const lead = canRegisterFrom(thread) ? thread : null;
    const primary = lead && <SalesRegisterButton compact={compact} onOpen={() => setRegistering(lead)} />;
    // The picker searches with the registration check, so it needs that key too.
    const leadId = can('leads.link_family') && check && canLinkFamily(thread) ? thread.lead_id : null;
    const linkItem = leadId ? [
      <Button key="link-family" type="button" size="sm" variant="ghost" onClick={() => setLinkingFamily(leadId)}>{t.inbox.linkFamily.action}</Button>,
    ] : [];
    return { primary, items: [...checkItem, ...linkItem], dialogs };
  }

  const item = (key: string, label: string, onClick: () => void) => (
    <Button key={key} type="button" size="sm" variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
  const subscribe = () => setOpened({ start: 'subscribe' });
  const due = students.filter((s) => s.renew_due);
  const single = due.length === 1 ? due[0] : undefined;
  const renew = () => setOpened({ start: 'subscribe', renew: true, ...(single ? { studentId: single.id } : {}) });
  // One entry per action: the only child opens it straight away, several are picked in ChildChoiceDialog.
  const entry = (kind: Choice) => {
    const { title, list, open } = choices[kind];
    const [only] = list;
    if (!only) return [];
    return [item(kind, title, () => (list.length === 1 ? open(only) : setChoosing(kind)))];
  };
  const items = [
    ...checkItem,
    ...(due.length > 0 ? [item('subscribe', t.salesMoney.newSubscription, subscribe)] : []),
    ...(students.some((s) => s.open.length > 0) ? [item('transfer', t.salesMoney.recordTransfer, () => setOpened({ start: 'transfer' }))] : []),
    ...entry('course'),
    ...entry('trial'),
  ];
  const primary =
    due.length > 0 ? (
      <SalesPrimaryAction compact={compact} icon="box" label={t.students.renew} onClick={renew} />
    ) : (
      <SalesPrimaryAction compact={compact} icon="plus" label={t.salesMoney.newSubscription} onClick={subscribe} />
    );
  return { primary, items, dialogs };
}

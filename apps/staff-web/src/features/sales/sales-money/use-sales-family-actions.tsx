import { canLinkFamily, canPickTrialDate, type SalesFamilyStudent, type SalesStudentRef, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Button, Toast, usePermissions, t } from '@ab/web-kit';
import { RegistrationCheckTrigger } from '@/features/sales/sales/registration/RegistrationCheckButton';
import { RegistrationCheckDialog } from '@/features/sales/sales/registration/RegistrationCheckDialog';
import { TrialDateDialog } from '@/features/teaching/booking/trial-date/dialog/TrialDateDialog';
import { LinkFamilyDialog } from '@/features/messaging/inbox';
import { useInboxMode } from '@/features/messaging/inbox';
import { SalesRegisterButton, SalesRegisterDialog } from '@/features/messaging/inbox';
import { canRegisterFrom, useMaySend } from '@/features/messaging/inbox';
import { salesFamilyQuery } from './api';
import { ChildChoiceDialog } from './ChildChoiceDialog';
import { SalesCourseDialog } from './course/SalesCourseDialog';
import { useLinkedCourse } from './course/linked-course';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';
import { SalesPrimaryAction } from './SalesPrimaryAction';
import { hasCourse } from './SalesSubscribeAction';

type Opened = { start: FlowStart; studentId?: string; renew?: boolean };
type Choice = 'course' | 'trial';
type LeadThread = ThreadView & { lead_id: string };

export interface SalesFamilyActions {
  primary: ReactNode;
  /** In order; empty means no menu. */
  items: ReactNode[];
  /** Every dialog (register, check, money, course), rendered outside the menu (they portal). */
  dialogs: ReactNode;
}

/** No child is named on any action; every dialog's state lives here so it survives 900px (m13). */
export function useSalesFamilyActions({ thread, compact = false }: { thread: ThreadView; compact?: boolean }): SalesFamilyActions {
  const mode = useInboxMode();
  const sales = mode === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  // A payment link's text goes into the box wherever a text goes.
  const canSend = useMaySend(thread);
  const { can } = usePermissions();
  const check = can('students.check_registration');
  const [opened, setOpened] = useState<Opened | null>(null);
  const [course, setCourse] = useLinkedCourse();
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
  // sales.renew_any (docs/16 row 38) lists children not hers for money and course days only.
  const own = students.filter((s) => s.mine !== false);
  // A new trial date only for her students without a running subscription.
  const choices: Record<Choice, { title: string; list: SalesFamilyStudent[]; open: (s: SalesFamilyStudent) => void }> = {
    course: { title: t.booking.courseDays, list: students.filter(hasCourse), open: (s) => setCourse(s.id) },
    trial: { title: t.trialDate.action, list: own.filter((s) => canPickTrialDate(s.status)), open: (s) => setTrialFor({ id: s.id, name: s.name, code: s.code }) },
  };
  const chosen = choosing ? choices[choosing] : null;
  const pickChild = (s: SalesFamilyStudent) => {
    setChoosing(null);
    chosen?.open(s);
  };
  const checkItem = check ? [<RegistrationCheckTrigger key="check" onClick={() => setChecking(true)} />] : [];
  // Same shape for lead and family, else the open registration dialog re-mounts (journey 7).
  const dialogs = (
    <>
      {registering && <SalesRegisterDialog thread={registering} onClose={() => setRegistering(null)} />}
      {checking && <RegistrationCheckDialog phone={thread.phone_e164} onClose={() => setChecking(false)} />}
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
      {trialFor && <TrialDateDialog mode="sales" student={trialFor} onClose={() => setTrialFor(null)} />}
      {opened && (
        <SalesMoneyFlow {...opened} students={students} phone={thread.phone_e164} canSend={canSend} onClose={() => setOpened(null)} />
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

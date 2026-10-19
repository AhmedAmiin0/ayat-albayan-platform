import { isPackageEnded, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { usePermissions } from '@/features/auth/use-permissions';
import { RegistrationCheckButton } from '@/features/sales/RegistrationCheckButton';
import { t } from '@/lib/i18n';
import { useInboxMode } from '../mode';
import { SalesRegisterAction } from '../SalesRegisterAction';
import { salesFamilyQuery } from './api';
import { SalesCourseDialog } from './SalesCourseDialog';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';
import { hasCourse } from './SalesSubscribeAction';

type Opened = { start: FlowStart; studentId?: string };

export interface SalesFamilyActions {
  /** The one visible action: «تسجيل طالب جديد» on a lead, «اشتراك جديد» on a family of hers. */
  primary: ReactNode;
  /** The «المزيد» entries, in order; empty = no menu. */
  items: ReactNode[];
  /** The money / course dialogs, rendered outside the menu (they portal). */
  dialogs: ReactNode;
}

/**
 * The sales chat's header actions (R-ASST-01/04, W3), split into one visible action and the rest.
 * Family (GET /sales/money/family, her students only): «جدّد الاشتراك» per student whose package
 * ended, «سجّل تحويلًا بنكيًا» while a package is owed, «أيام الحلقات» per student with a course
 * (hasCourse); several children are named on each (the visible text is the accessible name).
 * «تحقق من التسجيل» (students.check_registration) always goes in the menu. `compact` (phones):
 * the visible action is an icon button. Outside sales mode everything is empty.
 */
export function useSalesFamilyActions({ thread, compact = false }: { thread: ThreadView; compact?: boolean }): SalesFamilyActions {
  const mode = useInboxMode();
  const sales = mode === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  const check = usePermissions().can('students.check_registration');
  const [opened, setOpened] = useState<Opened | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  if (mode !== 'sales') return { primary: null, items: [], dialogs: null };
  const students = sales ? (family.data?.students ?? []) : [];
  const checkItem = check ? [<RegistrationCheckButton key="check" phone={thread.phone_e164} />] : [];
  if (students.length === 0) return { primary: <SalesRegisterAction thread={thread} compact={compact} />, items: checkItem, dialogs: null };

  const named = (label: string, name: string) => (students.length > 1 ? `${label} — ${name}` : label);
  const item = (key: string, label: string, onClick: () => void) => (
    <Button key={key} type="button" size="sm" variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
  const subscribe = () => setOpened({ start: 'subscribe' });
  const items = [
    ...checkItem,
    ...students
      .filter((s) => isPackageEnded(s.status))
      .map((s) => item(`renew-${s.id}`, named(t.students.renew, s.name), () => setOpened({ start: 'subscribe', studentId: s.id }))),
    ...(students.some((s) => s.open.length > 0) ? [item('transfer', t.salesMoney.recordTransfer, () => setOpened({ start: 'transfer' }))] : []),
    ...students.filter(hasCourse).map((s) => item(`course-${s.id}`, named(t.booking.courseDays, s.name), () => setCourse(s.id))),
  ];
  const primary = compact ? (
    <IconButton label={t.salesMoney.newSubscription} onClick={subscribe} className="text-lapis">
      <Icon name="plus" />
    </IconButton>
  ) : (
    <Button type="button" size="sm" variant="secondary" onClick={subscribe}>
      <Icon name="plus" />
      {t.salesMoney.newSubscription}
    </Button>
  );
  const dialogs = (
    <>
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
      {opened && <SalesMoneyFlow {...opened} students={students} onClose={() => setOpened(null)} />}
    </>
  );
  return { primary, items, dialogs };
}

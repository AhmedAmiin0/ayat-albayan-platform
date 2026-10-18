import { isPackageEnded, type StudentStatus, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { useInboxMode } from '../mode';
import { salesFamilyQuery } from './api';
import { SalesCourseDialog } from './SalesCourseDialog';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';

type Opened = { start: FlowStart; studentId?: string };

/** Who gets «أيام الحلقات»: a student with a subscription to follow (owner 2026-10-18). */
const COURSE_STATUSES: ReadonlySet<StudentStatus> = new Set(['pending_subscription', 'active', 'pending_renewal']);

/**
 * «اشتراك جديد» and «سجّل تحويلًا بنكيًا» in a sales chat (owner 2026-10-12, R-ASST-01/04): only in sales
 * mode, only on a family's chat, and only when the family has students she brought (GET
 * /sales/money/family); the transfer only while one of them has a package still owed. Each of them
 * whose package ended (pending_renewal / expired, owner 2026-10-15) gets «جدّد الاشتراك»: the same
 * subscribe step with that student already picked, naming the child when several of hers are listed
 * (the visible text is the accessible name, as mobile renewTargets). A student with a subscription
 * (pending_subscription / active / pending_renewal) gets «أيام الحلقات»: she books its weekly course.
 */
export function SalesSubscribeAction({ thread }: { thread: ThreadView }) {
  const sales = useInboxMode() === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  const [opened, setOpened] = useState<Opened | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const students = family.data?.students ?? [];
  if (!sales || students.length === 0) return null;
  const owed = students.some((s) => s.open.length > 0);
  const ended = students.filter((s) => isPackageEnded(s.status));
  const named = (label: string, name: string) => (students.length > 1 ? `${label} — ${name}` : label);

  return (
    <span className="flex flex-wrap items-center gap-2">
      {ended.map((s) => (
        <Button key={s.id} type="button" size="sm" onClick={() => setOpened({ start: 'subscribe', studentId: s.id })}>
          {named(t.students.renew, s.name)}
        </Button>
      ))}
      <Button type="button" size="sm" variant={ended.length > 0 ? 'secondary' : 'primary'} onClick={() => setOpened({ start: 'subscribe' })}>
        <Icon name="plus" />
        {t.salesMoney.newSubscription}
      </Button>
      {owed && (
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpened({ start: 'transfer' })}>
          {t.salesMoney.recordTransfer}
        </Button>
      )}
      {students
        .filter((s) => COURSE_STATUSES.has(s.status))
        .map((s) => (
          <Button key={`course-${s.id}`} type="button" size="sm" variant="secondary" onClick={() => setCourse(s.id)}>
            {named(t.booking.courseDays, s.name)}
          </Button>
        ))}
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
      {opened && <SalesMoneyFlow {...opened} students={students} onClose={() => setOpened(null)} />}
    </span>
  );
}

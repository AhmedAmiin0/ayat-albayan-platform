import { isPackageEnded, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { useInboxMode } from '../mode';
import { salesFamilyQuery } from './api';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';

type Opened = { start: FlowStart; studentId?: string };

/**
 * «اشتراك جديد» and «سجّل تحويلًا بنكيًا» in a sales chat (owner 2026-10-12, R-ASST-01/04): only in sales
 * mode, only on a family's chat, and only when the family has students she brought (GET
 * /sales/money/family); the transfer only while one of them has a package still owed. Each of them
 * whose package ended (pending_renewal / expired, owner 2026-10-15) gets «جدّد الاشتراك»: the same
 * subscribe step with that student already picked, naming the child when several of hers are listed
 * (the visible text is the accessible name, as mobile renewTargets).
 */
export function SalesSubscribeAction({ thread }: { thread: ThreadView }) {
  const sales = useInboxMode() === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  const [opened, setOpened] = useState<Opened | null>(null);
  const students = family.data?.students ?? [];
  if (!sales || students.length === 0) return null;
  const owed = students.some((s) => s.open.length > 0);
  const ended = students.filter((s) => isPackageEnded(s.status));

  return (
    <span className="flex flex-wrap items-center gap-2">
      {ended.map((s) => (
        <Button key={s.id} type="button" size="sm" onClick={() => setOpened({ start: 'subscribe', studentId: s.id })}>
          {students.length > 1 ? `${t.students.renew} — ${s.name}` : t.students.renew}
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
      {opened && <SalesMoneyFlow {...opened} students={students} onClose={() => setOpened(null)} />}
    </span>
  );
}

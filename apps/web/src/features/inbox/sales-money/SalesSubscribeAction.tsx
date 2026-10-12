import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { useInboxMode } from '../mode';
import { salesFamilyQuery } from './api';
import { SalesMoneyFlow, type FlowStart } from './SalesMoneyFlow';

/**
 * «اشتراك جديد» and «سجّل تحويلًا بنكيًا» in a sales chat (owner 2026-10-12, R-ASST-01/04): only in sales
 * mode, only on a family's chat, and only when the family has students she brought (GET
 * /sales/money/family); the transfer only while one of them has a package still owed.
 */
export function SalesSubscribeAction({ thread }: { thread: ThreadView }) {
  const sales = useInboxMode() === 'sales' && !!thread.guardian_id;
  const family = useQuery({ ...salesFamilyQuery(thread.phone_e164), enabled: sales });
  const [start, setStart] = useState<FlowStart | null>(null);
  const students = family.data?.students ?? [];
  if (!sales || students.length === 0) return null;
  const owed = students.some((s) => s.open.length > 0);

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={() => setStart('subscribe')}>
        <Icon name="plus" />
        {t.salesMoney.newSubscription}
      </Button>
      {owed && (
        <Button type="button" size="sm" variant="secondary" onClick={() => setStart('transfer')}>
          {t.salesMoney.recordTransfer}
        </Button>
      )}
      {start && <SalesMoneyFlow start={start} students={students} onClose={() => setStart(null)} />}
    </span>
  );
}

import type { TeacherEarningView } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Toast } from '@/components/ui/overlay/toast';
import { downloadCsv } from '@/features/exports/api';
import { currentMonth } from '@/features/payouts/api';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n';
import { balanceQuery, type Scope } from './api';
import { EarningsCards } from './EarningsCards';
import { PayDialog } from './PayDialog';
import { PaymentsHistory } from './PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';
import { teacherLabel } from '@/lib/teacher-label';

/**
 * /admin/teachers/:teacherId/earnings «مستحقات المعلم»: balance cards, the sessions with ticks, a
 * pay dialog for the ticked ones (or everything outstanding), and the payments made so far.
 */
export function TeacherEarningsPage({ teacherId }: { teacherId: string }) {
  const scope: Scope = { kind: 'admin', teacherId };
  const balance = useQuery(balanceQuery(scope));
  const [selected, setSelected] = useState<Map<string, TeacherEarningView>>(new Map());
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ledger = useMutation({ mutationFn: () => downloadCsv({ kind: 'teacher-ledger', params: { month: currentMonth(), teacherId } }) });

  if (balance.isError) return <FormAlert>{t.common.notFound}</FormAlert>;
  if (!balance.data) return <ListSkeleton />;
  const data = balance.data;
  const canPay = data.outstanding > 0;

  return (
    <>
      <PageHead className="mb-3.5">
        <Cartouche>{`${t.earnings.title} · ${teacherLabel(data.teacher)}`}</Cartouche>
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Link to="/admin/teachers/$teacherId" params={{ teacherId }} className="self-center text-sm text-lapis underline underline-offset-4">
            {t.earnings.back}
          </Link>
          <Button type="button" variant="secondary" disabled={ledger.isPending} onClick={() => ledger.mutate()}>
            {t.finance.ledgerCsv}
          </Button>
          <Button disabled={!canPay} onClick={() => setPaying(true)}>
            <Icon name="wallet" />
            {selected.size > 0 ? t.earnings.payChosen.replace('{count}', String(selected.size)) : t.earnings.pay}
          </Button>
        </div>
      </PageHead>
      <EarningsCards balance={data} />
      <SessionsPanel scope={scope} selected={selected} onSelected={setSelected} />
      <PaymentsHistory scope={scope} />
      {paying && (
        <PayDialog
          teacher={{ id: teacherId, name: teacherLabel(data.teacher) }}
          selected={selected}
          outstanding={data.outstanding}
          onClose={() => setPaying(false)}
          onSaved={(replayed) => {
            setPaying(false);
            setSelected(new Map());
            setToast(replayed ? t.earnings.replayed : t.earnings.saved);
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

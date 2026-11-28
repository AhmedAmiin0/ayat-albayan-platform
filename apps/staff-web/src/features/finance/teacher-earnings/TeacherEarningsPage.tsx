import type { TeacherEarningView } from '@ab/money';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Button,
  Cartouche,
  FormAlert,
  Icon,
  PageHead,
  Toast,
  ListSkeleton,
  t,
  teacherLabel,
} from '@ab/web-kit';
import { downloadCsv } from '@/features/reporting/exports';
import { currentMonth } from '@/features/finance/payouts';
import { balanceQuery, type Scope } from './api';
import { EarningsCards } from './EarningsCards';
import { PayDialog } from './payments/PayDialog';
import { PaymentsHistory } from './payments/PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';

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

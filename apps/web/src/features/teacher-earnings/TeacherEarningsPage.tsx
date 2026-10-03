import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { teacherEarningsQuery, teacherPaymentsQuery } from './api';
import { BalanceCards } from './BalanceCards';
import { EarningsTable } from './EarningsTable';
import { PayDialog } from './PayDialog';
import { PaymentHistory } from './PaymentHistory';
import { dueOf, isOpen, toggleAll, toggleOne } from './selection';

/** /admin/teachers/:id/earnings — balance, sessions to tick, «سجّل دفعة», payment history. */
export function TeacherEarningsPage({ teacherId }: { teacherId: string }) {
  const tt = t.teacherEarnings;
  const earnings = useQuery(teacherEarningsQuery(teacherId));
  const payments = useQuery(teacherPaymentsQuery(teacherId));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sessions = useMemo(() => earnings.data?.sessions ?? [], [earnings.data]);
  // Ticks of sessions that were paid meanwhile (a refetch) must not linger.
  const ticked = useMemo(() => new Set([...selected].filter((id) => sessions.some((e) => e.id === id && isOpen(e)))), [selected, sessions]);

  const selection = useMemo(
    () => ({
      selected: ticked,
      allSelected: sessions.some(isOpen) && sessions.filter(isOpen).every((e) => ticked.has(e.id)),
      onToggle: (id: string) => setSelected(toggleOne(ticked, id)),
      onToggleAll: () => setSelected(toggleAll(sessions, ticked)),
    }),
    [ticked, sessions],
  );

  if (earnings.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!earnings.data) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  const { balance, teacher } = earnings.data;

  return (
    <>
      <PageHead>
        <Cartouche>{tt.titleFor.replace('{name}', teacher.display_name_ar)}</Cartouche>
        <div className="ms-auto">
          <Button type="button" disabled={balance.open_sessions === 0} onClick={() => setPaying(true)}>
            {ticked.size > 0 ? tt.paySelected.replace('{n}', String(ticked.size)) : tt.pay}
          </Button>
        </div>
      </PageHead>
      <BalanceCards balance={balance} />
      <EarningsTable sessions={sessions} selection={selection} emptyText={tt.empty} />
      <PaymentHistory payments={payments.data ?? []} teacherId={teacherId} />
      {payments.isError && <FormAlert>{t.common.error}</FormAlert>}
      {paying && (
        <PayDialog
          teacherId={teacherId}
          earningIds={[...ticked]}
          due={dueOf(sessions, ticked)}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false);
            setSelected(new Set());
            setToast(tt.saved);
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

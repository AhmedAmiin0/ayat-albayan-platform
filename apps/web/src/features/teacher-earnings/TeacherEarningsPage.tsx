import type { TeacherEarningView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { balanceQuery, type Scope } from './api';
import { EarningsCards } from './EarningsCards';
import { PayDialog } from './PayDialog';
import { PaymentsHistory } from './PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';

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

  if (balance.isError) return <FormAlert>{t.common.notFound}</FormAlert>;
  if (!balance.data) return <ListSkeleton />;
  const data = balance.data;
  const canPay = data.outstanding > 0;

  return (
    <>
      <PageHead className="mb-3.5">
        <Cartouche>{`${t.earnings.title} · ${data.teacher.display_name_ar}`}</Cartouche>
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Link to="/admin/teachers/$teacherId" params={{ teacherId }} className="self-center text-sm text-lapis underline underline-offset-4">
            {t.earnings.back}
          </Link>
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
          teacher={{ id: teacherId, name: data.teacher.display_name_ar }}
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

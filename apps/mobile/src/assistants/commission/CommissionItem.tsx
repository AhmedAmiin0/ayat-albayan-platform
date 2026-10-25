import type { AssistantCommissionView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/payments/format';
import { MoneyCard } from '@/sales-money/components/MoneyCard';
import { Button } from '@/core/ui/primitives/Button';
import { assistantsErrorText } from '../api/errors';
import { CommissionFacts } from './CommissionFacts';
import { useVoidCommission } from '../api/mutations';
import { ReasonConfirm } from '../statements/components/ReasonConfirm';

export interface CommissionItemProps {
  commission: AssistantCommissionView;
  /** assistantpay.write: «إلغاء العمولة» on an earned commission (web commission-columns). */
  canWrite: boolean;
  onNotice: (text: string) => void;
}

/** A commission card; voiding asks for a reason (audited) and is disabled while it runs. */
export function CommissionItem({ commission: c, canWrite, onNotice }: CommissionItemProps) {
  const [asking, setAsking] = useState(false);
  const run = useVoidCommission();
  const L = t.assistants.ledger;
  const cancel = () => {
    run.reset();
    setAsking(false);
  };
  return (
    <MoneyCard>
      <CommissionFacts commission={c} />
      {canWrite && c.status === 'earned' && !asking ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="ghost" label={L.void} onPress={() => setAsking(true)} />
        </View>
      ) : null}
      {asking ? (
        <ReasonConfirm
          message={`${L.voidTitle.replace('{student}', c.student.name)}. ${L.voidBody.replace('{amount}', money(c.amount, c.currency))}`}
          confirmLabel={L.void}
          busy={run.isPending}
          onConfirm={(reason) =>
            run.mutate(
              { id: c.id, reason },
              {
                onSuccess: () => {
                  setAsking(false);
                  onNotice(t.mobileSalesMoney.done.void);
                },
              },
            )
          }
          onCancel={cancel}
        />
      ) : null}
      {asking && run.isError ? <ErrorLine message={assistantsErrorText(run.error)} /> : null}
    </MoneyCard>
  );
}

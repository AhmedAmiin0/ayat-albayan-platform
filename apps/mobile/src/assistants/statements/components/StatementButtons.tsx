import type { AssistantStatementView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { openStatementReceipt } from '../hooks/receipt-link';
import { statementActions, type StatementAction, type StatementCan } from '../hooks/statement-can';

export interface StatementButtonsProps {
  statement: AssistantStatementView;
  can: StatementCan;
  linesOpen: boolean;
  /** Every action but the receipt, which opens here. */
  onAction: (action: Exclude<StatementAction, 'receipt'>) => void;
}

/** One button per allowed action, in the web's order (statementActions); «الإيصال» opens a signed link. */
export function StatementButtons({ statement, can, linesOpen, onAction }: StatementButtonsProps) {
  const [receiptError, setReceiptError] = useState(false);
  const label: Record<StatementAction, string> = {
    details: linesOpen ? t.mobileSalesMoney.hideLines : t.assistants.statements.details,
    approve: t.payouts.approve,
    pay: t.payouts.markPaid,
    reopen: t.finance.reopen,
    unpay: t.finance.unpay,
    receipt: t.earnings.viewReceipt,
  };
  const press = (a: StatementAction) => {
    if (a !== 'receipt') return onAction(a);
    setReceiptError(false);
    openStatementReceipt(statement.id).catch(() => setReceiptError(true));
  };
  const ghost = (a: StatementAction) => a === 'details' || a === 'reopen' || a === 'unpay';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {statementActions(statement, can).map((a) => (
          <Button key={a} variant={ghost(a) ? 'ghost' : 'secondary'} label={label[a]} onPress={() => press(a)} />
        ))}
      </View>
      {receiptError ? <ErrorLine message={t.mobileFinance.payouts.receiptFailed} /> : null}
    </View>
  );
}

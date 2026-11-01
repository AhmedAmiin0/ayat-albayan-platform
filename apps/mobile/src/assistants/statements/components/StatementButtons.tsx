import type { AssistantStatementView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { openStatementReceipt } from '@/assistants/statements/hooks/receipt-link';
import { statementActions, type StatementAction, type StatementCan } from '@/assistants/statements/hooks/statement-can';

interface StatementButtonsProps {
  statement: AssistantStatementView;
  can: StatementCan;
  linesOpen: boolean;
  /** Every action but the receipt, which opens here. */
  onAction: (action: Exclude<StatementAction, 'receipt'>) => void;
}

/**
 * One button per allowed action (at most three), in the web's order (statementActions), as ONE ButtonRow
 * of outlined buttons (docs/07 §6); «إلغاء الدفع» is the danger one. «الإيصال» opens a signed link.
 */
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
  return (
    <View style={{ gap: 8 }}>
      <ButtonRow>
        {statementActions(statement, can).map((a) => (
          <Button key={a} variant={a === 'unpay' ? 'danger' : 'secondary'} label={label[a]} onPress={() => press(a)} />
        ))}
      </ButtonRow>
      {receiptError ? <ErrorLine message={t.mobileFinance.payouts.receiptFailed} /> : null}
    </View>
  );
}

import { PAYMENT_METHODS, type AssistantStatementView, type PaymentMethod } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import type { PayDraft } from '@/finance/payouts/payout-actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { money } from '@/core/lib/money/format';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { PaidDayPicker } from '@/core/ui/form/PaidDayPicker';
import { ReceiptPicker } from '@/core/ui/form/ReceiptPicker';
import { statementMonth } from '@/sales-money/lib/money-text';
import { useNow } from '@/core/lib/time/use-now';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { assistantsErrorText } from '@/assistants/api/errors';
import { usePayStatement } from '@/assistants/statements/hooks/use-pay-statement';

const methodPills = (): FilterPill<PaymentMethod>[] => PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

interface PayStatementFormProps {
  statement: AssistantStatementView;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * «تأكيد الدفع» of a statement (web PayStatementDialog): method (bank by default), day, note and the
 * receipt photo; the receipt is uploaded first, then one request freezes the statement as paid.
 */
export function PayStatementForm({ statement, onDone, onCancel }: PayStatementFormProps) {
  const now = useNow();
  const pay = usePayStatement(statement);
  const [draft, setDraft] = useState<PayDraft>({ method: 'bank', daysAgo: 0, note: '', receipt: null });
  const set = (patch: Partial<PayDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const S = t.assistants.statements;
  const amounts = Object.entries(statement.totals)
    .map(([c, v]) => money(v.total, c))
    .join(t.common.listSeparator);
  return (
    <View style={{ gap: 20 }}>
      <FormLabel>{S.payTitle.replace('{assistant}', statement.assistant.name)}</FormLabel>
      <Note>{S.payDue.replace('{month}', statementMonth(statement)).replace('{amounts}', amounts)}</Note>
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills role="radiogroup" accessibilityLabel={t.payments.method} items={methodPills()} value={draft.method} onChange={(method) => set({ method })} wrap />
      </View>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <Field label={t.payments.note} value={draft.note} onChangeText={(note) => set({ note })} maxLength={500} />
      <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      {pay.isError ? <ErrorLine message={assistantsErrorText(pay.error)} /> : null}
      <ButtonRow>
        <Button label={pay.isPending ? t.earnings.saving : t.finance.confirmPaid} busy={pay.isPending} onPress={() => pay.mutate(draft, { onSuccess: onDone })} />
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} disabled={pay.isPending} />
      </ButtonRow>
    </View>
  );
}

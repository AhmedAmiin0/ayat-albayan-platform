import { useState } from 'react';
import { Modal, View } from 'react-native';
import { t, Screen, ScreenHeader, Button, ErrorLine, Section, currencyName, money } from '@ab/mobile-kit';
import { paymentErrorText } from '@/core/lib/money/payment-errors';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Note } from '@/core/ui/feedback/Note';
import { AmountField } from '@/payments/components/AmountField';
import { checkNewAmount } from './amount-edit';
import type { AmountEditMutation } from './use-amount-edit';

const e = t.payments.editAmount;

interface AmountEditSheetProps {
  payment: { amount: number; currency: string };
  edit: AmountEditMutation;
  onClose: () => void;
}

/** Confirms old to new before the PATCH; the same amount asks nothing. */
export function AmountEditSheet({ payment, edit, onClose }: AmountEditSheetProps) {
  const [text, setText] = useState(String(payment.amount));
  const [error, setError] = useState<string>();
  const [next, setNext] = useState<number | null>(null);
  const shown = (amount: number) => money(amount, payment.currency);
  const review = () => {
    const check = checkNewAmount(text, payment.amount);
    setError(check.ok ? undefined : check.error);
    setNext(check.ok ? check.amount : null);
  };
  const type = (value: string) => {
    setText(value);
    setNext(null);
  };
  const body = (amount: number) =>
    e.confirmBody.replace('{old}', shown(payment.amount)).replace('{new}', shown(amount));
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader
          size="h2"
          title={e.title}
          trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
        />
        <View style={{ gap: 16 }}>
          <Note>{e.current.replace('{amount}', shown(payment.amount))}</Note>
          <AmountField
            label={e.newAmount.replace('{currency}', currencyName(payment.currency))}
            value={text}
            onChange={type}
            currency={payment.currency}
            {...(error ? { error } : {})}
          />
          {next === null ? <Button label={e.action} onPress={review} /> : (
            <Section title={e.confirmTitle}>
              <InlineConfirm
                message={body(next)}
                confirmLabel={e.confirm}
                busy={edit.isPending}
                onConfirm={() => edit.mutate(next, { onSuccess: onClose })}
                onCancel={() => setNext(null)}
              />
            </Section>
          )}
          {edit.error ? <ErrorLine message={paymentErrorText(edit.error)} /> : null}
        </View>
      </Screen>
    </Modal>
  );
}

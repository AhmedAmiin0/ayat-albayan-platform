import type { PayoutView } from '@ab/shared';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PayoutActionBar } from './PayoutActionBar';
import { PayoutFacts } from './PayoutFacts';
import { PayoutPayForm } from './PayoutPayForm';

export interface PayoutDetailProps {
  payout: PayoutView;
  /** The pay form replaces the facts; the screen's back button closes it first. */
  paying: boolean;
  onPaying: (paying: boolean) => void;
  onNotice: (text: string) => void;
}

/** A statement and its actions. A refused action keeps the form and says why: the server decides. */
export function PayoutDetail({ payout, paying, onPaying, onNotice }: PayoutDetailProps) {
  const done = t.mobileFinance.payouts.done;
  if (paying) {
    return (
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <PayoutFacts payout={payout} />
        <PayoutPayForm
          payout={payout}
          onDone={() => {
            onPaying(false);
            onNotice(done.pay);
          }}
        />
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <PayoutFacts payout={payout} />
      <PayoutActionBar
        payout={payout}
        onPay={() => onPaying(true)}
        onDone={(move) => onNotice(done[move])}
      />
    </ScrollView>
  );
}

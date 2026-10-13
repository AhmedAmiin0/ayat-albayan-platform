import type { SalesFamilyStudent, SalesMoneySubscriptionView, SalesPaymentView } from '@ab/shared';
import { useState } from 'react';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesSubscribeStep } from './SalesSubscribeStep';
import { SalesTransferStep } from './SalesTransferStep';

export type FlowStart = 'subscribe' | 'transfer';

type Step =
  | { kind: 'subscribe' }
  | { kind: 'transfer'; sub: SalesMoneySubscriptionView | null }
  | { kind: 'done'; payment: SalesPaymentView };

type Props = { start: FlowStart; students: SalesFamilyStudent[]; onClose: () => void };

/** Her packages still owed, across her students of the family (the transfer step's picker). */
export const openPackages = (students: SalesFamilyStudent[]): SalesMoneySubscriptionView[] => students.flatMap((s) => s.open);

/**
 * The money flow of a sales chat: step 1 «اشتراك جديد» (calculator → saved at the API's price), step 2
 * «سجّل التحويل البنكي» (attachments optional) for the new package or one still owed, then the result.
 */
export function SalesMoneyFlow({ start, students, onClose }: Props) {
  const [step, setStep] = useState<Step>(start === 'subscribe' ? { kind: 'subscribe' } : { kind: 'transfer', sub: null });
  if (step.kind === 'subscribe') {
    return <SalesSubscribeStep students={students} onClose={onClose} onSaved={(sub) => setStep({ kind: 'transfer', sub })} />;
  }
  if (step.kind === 'transfer') {
    return (
      <SalesTransferStep
        fixed={step.sub}
        packages={openPackages(students)}
        onClose={onClose}
        onSaved={(payment) => setStep({ kind: 'done', payment })}
      />
    );
  }
  return <SalesDoneStep payment={step.payment} onClose={onClose} />;
}

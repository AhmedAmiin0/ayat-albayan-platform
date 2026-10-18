import type { SalesFamilyStudent, SalesMoneySubscriptionView, SalesPaymentView } from '@ab/shared';
import { useState } from 'react';
import { SalesCourseDialog } from './SalesCourseDialog';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesSubscribeStep } from './SalesSubscribeStep';
import { SalesTransferStep } from './SalesTransferStep';

export type FlowStart = 'subscribe' | 'transfer';

type Step =
  | { kind: 'subscribe' }
  | { kind: 'transfer'; sub: SalesMoneySubscriptionView | null }
  | { kind: 'done'; payment: SalesPaymentView };

/** `studentId`: the student picked up front («جدّد الاشتراك» on one of them). */
type Props = { start: FlowStart; studentId?: string | undefined; students: SalesFamilyStudent[]; onClose: () => void };

/** Her packages still owed, across her students of the family (the transfer step's picker). */
export const openPackages = (students: SalesFamilyStudent[]): SalesMoneySubscriptionView[] => students.flatMap((s) => s.open);

/**
 * The money flow of a sales chat: step 1 «اشتراك جديد» (calculator → saved at the API's price), step 2
 * «سجّل التحويل البنكي» (attachments optional) for the new package or one still owed, then the result.
 * Right after «اشتراك جديد» (and after the transfer) «احجز أيام الحلقات الآن» opens the course wizard
 * (owner 2026-10-18: before the transfer is fine); closing it comes back to the same step.
 */
export function SalesMoneyFlow({ start, studentId, students, onClose }: Props) {
  const [step, setStep] = useState<Step>(start === 'subscribe' ? { kind: 'subscribe' } : { kind: 'transfer', sub: null });
  const [course, setCourse] = useState<string | null>(null);
  if (course) return <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />;
  if (step.kind === 'subscribe') {
    return <SalesSubscribeStep students={students} picked={studentId} onClose={onClose} onSaved={(sub) => setStep({ kind: 'transfer', sub })} />;
  }
  if (step.kind === 'transfer') {
    const sub = step.sub;
    return (
      <SalesTransferStep
        fixed={sub}
        onBookCourse={sub ? () => setCourse(sub.student.id) : undefined}
        packages={openPackages(students)}
        onClose={onClose}
        onSaved={(payment) => setStep({ kind: 'done', payment })}
      />
    );
  }
  const paid = step.payment.student.id;
  return <SalesDoneStep payment={step.payment} onClose={onClose} onBookCourse={() => setCourse(paid)} />;
}

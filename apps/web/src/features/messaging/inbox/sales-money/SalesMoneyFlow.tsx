import { chatBinding, type SalesFamilyStudent, type SalesMoneySubscriptionView, type SalesPaymentView } from '@ab/shared';
import { useState } from 'react';
import { SalesCourseDialog } from './course/SalesCourseDialog';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesSubscribeStep } from './subscribe/SalesSubscribeStep';
import { SalesTransferStep } from './transfer/SalesTransferStep';

export type FlowStart = 'subscribe' | 'transfer';

type Step =
  | { kind: 'subscribe' }
  | { kind: 'transfer'; sub: SalesMoneySubscriptionView | null }
  | { kind: 'done'; payment: SalesPaymentView };

/**
 * `studentId`: the student picked up front («جدّد الاشتراك» on one of them). `renew`: the step is a renewal,
 * prefilled from the student's `renewal` and picking among her students due for one.
 */
type Props = {
  start: FlowStart;
  studentId?: string | undefined;
  renew?: boolean | undefined;
  students: SalesFamilyStudent[];
  /** The chat's phone (chatBinding: sent only for a child not hers, sales.renew_any). */
  phone?: string | undefined;
  onClose: () => void;
};

/** Her packages still owed, across her students of the family (the transfer step's picker). */
export const openPackages = (students: SalesFamilyStudent[]): SalesMoneySubscriptionView[] => students.flatMap((s) => s.open);

/**
 * The money flow of a sales chat: step 1 «اشتراك جديد» (calculator → saved at the API's price), step 2
 * «سجّل التحويل البنكي» (attachments optional) for the new package or one still owed, then the result.
 * Right after «اشتراك جديد» (and after the transfer) «احجز أيام الحلقات الآن» opens the course wizard
 * (owner 2026-10-18: before the transfer is fine) on top of the step; closing it comes back to it as left.
 */
export function SalesMoneyFlow({ start, studentId, renew, students, phone = '', onClose }: Props) {
  const [step, setStep] = useState<Step>(start === 'subscribe' ? { kind: 'subscribe' } : { kind: 'transfer', sub: null });
  const [course, setCourse] = useState<string | null>(null);
  // The course opens on top: the step under it stays mounted, so a typed transfer survives it.
  return (
    <>
      <FlowStep step={step} setStep={setStep} onCourse={setCourse} {...{ studentId, renew, students, phone, onClose }} />
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
    </>
  );
}

type FlowStepProps = Omit<Props, 'start'> & { step: Step; setStep: (s: Step) => void; onCourse: (studentId: string) => void };

function FlowStep({ step, setStep, onCourse, studentId, renew, students, phone = '', onClose }: FlowStepProps) {
  // A child not hers (sales.renew_any, docs/16 row 38): subscribe / renew / transfer only; «أيام الحلقات» stays hers.
  const bindOf = (id: string) => chatBinding(students, { studentId: id, phone });
  const course = (id: string) => (bindOf(id).phone ? undefined : () => onCourse(id));
  if (step.kind === 'subscribe') {
    const onSaved = (sub: SalesMoneySubscriptionView) => setStep({ kind: 'transfer', sub });
    return <SalesSubscribeStep students={students} phone={phone} picked={studentId} renew={renew} onClose={onClose} onSaved={onSaved} />;
  }
  if (step.kind === 'transfer') {
    const sub = step.sub;
    return (
      <SalesTransferStep
        fixed={sub}
        bindOf={bindOf}
        onBookCourse={sub ? course(sub.student.id) : undefined}
        packages={openPackages(students)}
        onClose={onClose}
        onSaved={(payment) => setStep({ kind: 'done', payment })}
      />
    );
  }
  return <SalesDoneStep payment={step.payment} onClose={onClose} onBookCourse={course(step.payment.student.id)} />;
}

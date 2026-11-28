import {
  chatBinding,
  type PaymentLinkView,
  type SalesFamilyStudent,
  type SalesMoneySubscriptionView,
  type SalesPaymentView,
} from '@ab/shared';
import { useState } from 'react';
import { SalesCourseDialog } from './course/SalesCourseDialog';
import { CreatedLink } from './payment-link/CreatedLink';
import { SalesDoneStep } from './SalesDoneStep';
import { SalesSubscribeStep } from './subscribe/SalesSubscribeStep';
import { SalesTransferStep } from './transfer/SalesTransferStep';

export type FlowStart = 'subscribe' | 'transfer';

type Step =
  | { kind: 'subscribe' }
  | { kind: 'transfer'; sub: SalesMoneySubscriptionView | null }
  | { kind: 'done'; payment: SalesPaymentView }
  | { kind: 'link'; link: PaymentLinkView };

/** `studentId` is picked up front; `renew` prefills from the student's `renewal`. */
interface Props {
  start: FlowStart;
  studentId?: string | undefined;
  renew?: boolean | undefined;
  students: SalesFamilyStudent[];
  /** The chat's phone (chatBinding: sent only for a child not hers, sales.renew_any). */
  phone?: string | undefined;
  /** A text may go in the chat now (useMaySend): a payment link's text goes into its box. */
  canSend?: boolean | undefined;
  onClose: () => void;
}

/** Her packages still owed, across her students of the family (the transfer step's picker). */
export const openPackages = (students: SalesFamilyStudent[]): SalesMoneySubscriptionView[] =>
  students.flatMap((s) => s.open);

/** The course wizard may open before the transfer; closing it returns to the step as left. */
export function SalesMoneyFlow({
  start,
  studentId,
  renew,
  students,
  phone = '',
  canSend = false,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>(
    start === 'subscribe' ? { kind: 'subscribe' } : { kind: 'transfer', sub: null },
  );
  const [course, setCourse] = useState<string | null>(null);
  // The course opens on top: the step under it stays mounted, so a typed transfer survives it.
  return (
    <>
      <FlowStep
        step={step}
        setStep={setStep}
        onCourse={setCourse}
        {...{ studentId, renew, students, phone, canSend, onClose }}
      />
      {course && <SalesCourseDialog studentId={course} onClose={() => setCourse(null)} />}
    </>
  );
}

type FlowStepProps = Omit<Props, 'start'> & {
  step: Step;
  setStep: (s: Step) => void;
  onCourse: (studentId: string) => void;
};

function FlowStep({
  step,
  setStep,
  onCourse,
  studentId,
  renew,
  students,
  phone = '',
  canSend = false,
  onClose,
}: FlowStepProps) {
  // A child not hers (sales.renew_any, docs/16 row 38): writes and course days carry its phone.
  const bindOf = (id: string) => chatBinding(students, { studentId: id, phone });
  const course = (id: string) => () => onCourse(id);
  if (step.kind === 'subscribe') {
    const onSaved = (sub: SalesMoneySubscriptionView) => setStep({ kind: 'transfer', sub });
    const onLinked = (link: PaymentLinkView) => setStep({ kind: 'link', link });
    return (
      <SalesSubscribeStep
        {...{ students, phone, renew, onClose, onSaved, onLinked }}
        picked={studentId}
      />
    );
  }
  if (step.kind === 'link') {
    const book = course(step.link.student.id);
    const props = { link: step.link, phone, canSend, onClose };
    return <CreatedLink {...props} onBookCourse={book} />;
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
  return (
    <SalesDoneStep
      payment={step.payment}
      onClose={onClose}
      onBookCourse={course(step.payment.student.id)}
    />
  );
}

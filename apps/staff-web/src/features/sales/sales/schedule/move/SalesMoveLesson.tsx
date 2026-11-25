import type { SalesScheduleLesson } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button, t } from '@ab/web-kit';
import { SalesRescheduleForm } from './SalesRescheduleForm';

type Step = 'button' | 'form' | 'done';

/** Needs lessons.reschedule; the drawer shows it only when canSalesChangeLesson allows. */
export function SalesMoveLesson({ lesson }: { lesson: SalesScheduleLesson }) {
  const [step, setStep] = useState<Step>('button');
  const views: Record<Step, () => ReactNode> = {
    button: () => (
      <Button type="button" variant="secondary" onClick={() => setStep('form')}>
        {t.sales.lessonActions.reschedule}
      </Button>
    ),
    form: () => (
      <SalesRescheduleForm lesson={lesson} onBack={() => setStep('button')} onDone={() => setStep('done')} />
    ),
    done: () => <p role="status" className="text-sm text-ink-2">{t.lessons.rescheduled}</p>,
  };
  return views[step]();
}

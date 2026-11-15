import type { SalesScheduleLesson } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { SalesRescheduleForm } from './SalesRescheduleForm';

type Step = 'button' | 'form' | 'done';

/**
 * «تغيير الموعد» in the /sales drawer (owner 2026-11-02, lessons.reschedule): the button, then the
 * form in place, then «تم تغيير الموعد». The drawer shows it only when canSalesChangeLesson allows.
 */
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

import { useState } from 'react';
import { CorrectLessonChoice, type CorrectBy } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit';
import { useSalesCancelLesson } from './sales-cancel-api';
import { SalesCorrectConfirm } from './SalesCorrectConfirm';

export interface SalesCorrectLessonProps {
  lessonId: string;
  /** Held automatically (auto_held): the hint says so. */
  autoHeld: boolean;
}

/** POST /sales/lessons/:id/cancel with { by, reason? }. */
export function SalesCorrectLesson({ lessonId, autoHeld }: SalesCorrectLessonProps) {
  const [by, setBy] = useState<CorrectBy | null>(null);
  const cancel = useSalesCancelLesson(lessonId);
  if (cancel.isSuccess) return <p role="status" className="text-sm text-ink-2">{t.lessons.correct.done}</p>;
  return by ? (
    <SalesCorrectConfirm
      by={by}
      pending={cancel.isPending}
      error={cancel.error}
      onSubmit={(reason) => cancel.mutate({ by, ...(reason ? { reason } : {}) })}
      onBack={() => setBy(null)}
    />
  ) : (
    <CorrectLessonChoice autoHeld={autoHeld} onPick={setBy} />
  );
}

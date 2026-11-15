import { useState } from 'react';
import { CorrectLessonChoice, type CorrectBy } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { useSalesCancelLesson } from './sales-cancel-api';
import { SalesCorrectConfirm } from './SalesCorrectConfirm';

export interface SalesCorrectLessonProps {
  lessonId: string;
  /** Held automatically (auto_held): the hint says so. */
  autoHeld: boolean;
}

/**
 * «لم تنعقد الحلقة؟» in sales' lesson drawer (owner 2026-11-02): «ألغاها المعلم/ة» | «اعتذر
 * الطالب», then an optional reason and «تأكيد الإلغاء» → POST /sales/lessons/:id/cancel
 * { by, reason? }.
 */
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

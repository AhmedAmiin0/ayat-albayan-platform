import type { CourseChangeView } from '@ab/shared';
import { useRef, useState } from 'react';
import { useFocusOnChange } from '@/components/ui/use-focus-on-change';
import { t } from '@/lib/i18n';
import { changeBody, currentPicks } from './change-body';
import { ChangePicker } from './ChangePicker';
import { ChangeReview } from './ChangeReview';

export interface CourseChangeFormProps {
  view: CourseChangeView;
  /** After the change (the text to show or toast). */
  onDone: (message: string) => void;
  /** «رجوع» from the first step to the caller's screen; absent = none. */
  onBack?: (() => void) | undefined;
}

type Stage = 'pick' | 'review';

/**
 * «تغيير أيام الحلقات» (owner 2026-10-18): new days and times for the course's lessons that have not
 * happened yet, the teacher, length and zone kept. The same form for the assistant (sales chat, her
 * own student, never over a clash) and the admin (a lesson's drawer, over a clash with a reason); the
 * booking mode picks the routes. One idempotency key per form (rule 8).
 */
export function CourseChangeForm({ view, onDone, onBack }: CourseChangeFormProps) {
  const [picks, setPicks] = useState(() => currentPicks(view.course, new Date()));
  const [requestId] = useState(() => crypto.randomUUID());
  const [stage, setStage] = useState<Stage>('pick');
  const box = useRef<HTMLDivElement>(null);
  useFocusOnChange(box, stage);
  const body = stage === 'review' ? changeBody({ course: view.course, picks, requestId }) : null;
  return (
    <div ref={box} tabIndex={-1} role="group" aria-label={t.booking.courseChange.changeDays} className="grid gap-4 outline-none">
      {body ? (
        <ChangeReview body={body} tz={view.course.tz} onChangeSlot={() => setStage('pick')} onDone={onDone} />
      ) : (
        <ChangePicker view={view} picks={picks} onPicks={setPicks} onNext={() => setStage('review')} onBack={onBack} />
      )}
    </div>
  );
}

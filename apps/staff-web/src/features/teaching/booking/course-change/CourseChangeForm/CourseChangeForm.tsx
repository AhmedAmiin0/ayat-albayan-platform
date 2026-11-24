import type { CourseChangeView } from '@ab/shared';
import { useRef, useState } from 'react';
import { useFocusOnChange } from '@ab/web-kit/components/ui/overlay/use-focus-on-change';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { changeBody, currentPicks } from '@/features/teaching/booking/course-change/change-body';
import { ChangePicker } from '@/features/teaching/booking/course-change/ChangePicker';
import { ChangeReview } from '@/features/teaching/booking/course-change/ChangeReview';

export interface CourseChangeFormProps {
  view: CourseChangeView;
  /** After the change (the text to show or toast). */
  onDone: (message: string) => void;
  /** Back from the first step to the caller's screen; absent means none. */
  onBack?: (() => void) | undefined;
}

type Stage = 'pick' | 'review';

/** Future lessons only; one idempotency key per form (rule 8); the admin may override clashes. */
export function CourseChangeForm({ view, onDone, onBack }: CourseChangeFormProps) {
  const [prefilled] = useState(() => currentPicks(view.course, new Date()));
  const [picks, setPicks] = useState(() => prefilled.map((p) => p.at));
  const [requestId] = useState(() => crypto.randomUUID());
  const [stage, setStage] = useState<Stage>('pick');
  const box = useRef<HTMLDivElement>(null);
  useFocusOnChange(box, stage);
  const body = stage === 'review' ? changeBody({ course: view.course, picks, prefilled, requestId }) : null;
  return (
    <div ref={box} tabIndex={-1} role="group" aria-label={t.booking.courseChange.changeDays} className="grid gap-4 outline-none">
      {body ? (
        <ChangeReview body={body} course={view.course} onChangeSlot={() => setStage('pick')} onDone={onDone} />
      ) : (
        <ChangePicker view={view} picks={picks} onPicks={setPicks} onNext={() => setStage('review')} onBack={onBack} />
      )}
    </div>
  );
}

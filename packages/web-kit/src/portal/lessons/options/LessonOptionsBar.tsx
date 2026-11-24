import { lessonOptions, type LessonOption } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AskTimeDrawer } from './AskTimeDrawer';
import { DeclinePanel } from './DeclinePanel';
import { useLessonOptions } from './use-lesson-options';

interface LessonOptionsBarProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
}

const A = t.portal.actions;
const VARIANT: Readonly<Record<LessonOption, 'primary' | 'secondary' | 'ghost'>> = {
  confirm: 'primary',
  request: 'secondary',
  withdraw: 'secondary',
  decline: 'ghost',
};

/** A one-tap answer shows at once; a refusal replaces it with the reason. */
export function LessonOptionsBar({ lesson, student, now }: LessonOptionsBarProps) {
  const { open, setOpen, said, action, ids, send, pick } = useLessonOptions({ lesson, student });
  const options = lessonOptions(lesson, now);
  return (
    <div className="grid gap-2">
      {said && (
        <p role="status" className="animate-fade-up text-sm font-semibold text-ok">{said}</p>
      )}
      {action.error && open !== 'ask' && <FormAlert>{action.error}</FormAlert>}
      {open === 'decline' ? (
        <DeclinePanel
          lesson={lesson}
          busy={action.busy}
          onDecline={(reason) => send({ kind: 'cancel', ...ids, reason })}
          onBack={() => setOpen(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Button key={o} type="button" variant={VARIANT[o]} disabled={action.busy} onClick={pick[o]}>
              {A[o]}
            </Button>
          ))}
        </div>
      )}
      {open === 'ask' && (
        <AskTimeDrawer
          lesson={lesson}
          student={student}
          busy={action.busy}
          error={action.error}
          onClose={() => setOpen(null)}
          onSend={(ask) => send({ kind: 'request', ...ids, ...ask })}
        />
      )}
    </div>
  );
}

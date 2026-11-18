import { FAMILY_NOTICE, lessonOptions, type FamilyAction, type LessonOption } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AskTimeDrawer } from './AskTimeDrawer';
import { DeclinePanel } from './DeclinePanel';
import { useFamilyAction } from './use-family-action';

type Open = 'decline' | 'ask' | null;

interface LessonOptionsBarProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
}

const A = t.portal.actions;
type Variant = 'primary' | 'secondary' | 'ghost';
const button = (variant: Variant, family: string) => ({ variant, className: family });
const PEER = 'family:min-h-11 family:border-rule family:bg-raised family:text-lapis';

/** Each option's button; the family look's pills (boards): green, white outlined peers, cream. */
const BUTTON: Readonly<Record<LessonOption, { variant: Variant; className: string }>> = {
  confirm: button('primary', 'family:min-h-11 family:shadow-[0_8px_18px_rgba(4,120,87,0.22)]'),
  request: button('secondary', PEER),
  withdraw: button('secondary', PEER),
  decline: button('ghost', 'family:min-h-11 family:bg-sunk family:text-ink-2'),
};

/**
 * «خيارات الحلقة» on a web portal lesson (owner 2026-11-17): «سأحضر», «اطلب موعدًا آخر» or
 * «سحب الطلب», «أعتذر عن الحلقة», as the family app; the result said under the card.
 */
export function LessonOptionsBar({ lesson, student, now }: LessonOptionsBarProps) {
  const [open, setOpen] = useState<Open>(null);
  const [said, setSaid] = useState<string | null>(null);
  const action = useFamilyAction();
  const ids = { studentId: student.id, lessonId: lesson.id };
  const send = (a: FamilyAction) =>
    action.send(a, () => {
      setOpen(null);
      setSaid(A[FAMILY_NOTICE[a.kind]]);
    });
  const pick: Record<LessonOption, () => void> = {
    confirm: () => send({ kind: 'confirm', ...ids }),
    withdraw: () => send({ kind: 'withdraw', ...ids }),
    request: () => setOpen('ask'),
    decline: () => setOpen('decline'),
  };
  const options = lessonOptions(lesson, now);
  return (
    <div className="grid gap-2">
      {said && <p role="status" className="text-sm font-semibold text-ok">{said}</p>}
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
            <Button key={o} type="button" {...BUTTON[o]} disabled={action.busy} onClick={pick[o]}>
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

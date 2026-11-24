import { confirmedLine, excusedLine, requestChip } from '@ab/client-core';
import { firstName, lessonWhenAt, type PortalLesson, type PortalStudent } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useClock } from '@ab/web-kit/lib/clock';

const A = t.portal.actions;

interface FamilyLineProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
}

function ConfirmedLine({ lesson, student, now }: FamilyLineProps) {
  if (!confirmedLine(lesson, now)) return null;
  const line = A.confirmedLine.replace('{student}', firstName(student.name));
  return <p className="text-sm text-ok">{line}</p>;
}

export function FamilyLine(props: FamilyLineProps) {
  const { lesson, student } = props;
  const clock = useClock();
  const request = lesson.family?.request;
  const chip = requestChip(lesson);
  const excused = excusedLine(lesson);
  if (excused) return <p className="text-sm text-ink-2">{A[excused]}</p>;
  if (!request || !chip) return <ConfirmedLine {...props} />;
  if (chip === 'pendingChip') {
    const at = new Date(request.proposed_starts_at);
    const when = lessonWhenAt(at, { tz: student.tz, ...clock });
    return (
      <div className="grid gap-0.5 text-sm">
        <p className="font-semibold">{A.requestedLine.replace('{when}', when)}</p>
        <p className="text-ink-2">{A.staysNote}</p>
      </div>
    );
  }
  const note = request.decision_note && A.decisionNote.replace('{note}', request.decision_note);
  return <p className="text-sm text-ink-2">{[A.rejectedChip, note].filter(Boolean).join(' · ')}</p>;
}

import { excusedLine, requestChip } from '@ab/client-core';
import { lessonWhenAt, type PortalLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';

const A = t.portal.actions;

/**
 * What the family's request or excuse left on the lesson (canvas LessonXWebFamily): «طلبتم …»
 * with «يبقى موعد الحلقة كما هو…», a declined one with the academy's note, or the excuse's outcome.
 */
export function FamilyLine({ lesson, tz }: { lesson: PortalLesson; tz: string }) {
  const clock = useClock();
  const request = lesson.family?.request;
  const chip = requestChip(lesson);
  const excused = excusedLine(lesson);
  if (excused) return <p className="text-sm text-ink-2">{A[excused]}</p>;
  if (!request || !chip) return null;
  if (chip === 'pendingChip') {
    const when = lessonWhenAt(new Date(request.proposed_starts_at), { tz, ...clock });
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

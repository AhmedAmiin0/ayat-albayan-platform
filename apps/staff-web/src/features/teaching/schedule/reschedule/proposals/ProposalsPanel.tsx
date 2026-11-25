import { lessonWhenAt } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { NuqtaGlyph, t, teacherLabel, type Clock, useClock, useViewerTz } from '@ab/web-kit';
import { proposalsQuery } from '@/features/teaching/schedule/api';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { RequesterTag } from './RequesterTag';

/** The viewer's time; `clock.tz` is the viewer's zone (useViewerTz()). */
const when = (iso: string, clock: Clock & { tz: string }) => lessonWhenAt(new Date(iso), clock);

/** Pending move requests from teachers or families in any week (R-SCH-08); none renders nothing. */
export function ProposalsPanel({ onOpen }: { onOpen: (lesson: LessonView) => void }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const proposals = useQuery(proposalsQuery);
  const list = proposals.data ?? [];
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="proposals-title" className="mb-5 grid gap-2 rounded-md bg-act-soft px-4 py-3">
      <h2 id="proposals-title" className="flex items-center gap-2 text-sm font-bold">
        <NuqtaGlyph shape="half" className="text-act" />
        {t.lessons.proposal.title}
        <span className="tabular-nums text-act">{list.length}</span>
      </h2>
      <p className="text-xs text-ink-2">{t.lessons.proposal.hint}</p>
      <ul className="grid gap-1">
        {list.map((lesson) => (
          <li key={lesson.id}>
            <button
              type="button"
              onClick={() => onOpen(lesson)}
              className="min-h-11 w-full rounded-sm px-2 py-1.5 text-start text-sm hover:bg-sunk sm:min-h-9"
            >
              <RequesterTag proposal={lesson.pending_proposal} />
              <span className="font-semibold">{`${studentNames(lesson)} · ${teacherLabel(lesson.teacher)}`}</span>
              {': '}
              <span>
                {t.lessons.proposal.change
                  .replace('{from}', when(lesson.starts_at, clock))
                  .replace('{to}', when(lesson.pending_proposal?.proposed_starts_at ?? lesson.starts_at, clock))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

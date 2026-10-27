import { type LessonView, lessonWhenAt } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { proposalsQuery } from '../api';
import { studentNames } from '../lesson/lessons';
import { RIYADH_TZ } from '../tz';
import { type Clock, useClock } from '@/lib/clock';

const when = (iso: string, clock: Clock) => lessonWhenAt(new Date(iso), { tz: RIYADH_TZ, ...clock });

/**
 * «طلبات تغيير الميعاد» above the week (R-SCH-08): every lesson a teacher proposed to move, in any
 * week, as «سهيلة · أبرار: الأحد 4 أكتوبر 17:00 ← الاثنين 5 أكتوبر 18:00». Opening one shows the
 * drawer with «وافق» / «ارفض». Nothing pending → nothing rendered.
 */
export function ProposalsPanel({ onOpen }: { onOpen: (lesson: LessonView) => void }) {
  const clock = useClock();
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

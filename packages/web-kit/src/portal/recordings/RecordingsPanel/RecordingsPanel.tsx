import { hasVideo, partIdsByLesson, recordingMonths } from '@ab/client-core';
import { dateText, type PortalRecording, type PortalRecordings, type PortalStudent } from '@ab/shared';
import { useRef, useState } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { useNowPlaying } from '@ab/web-kit/lesson-files/use-now-playing';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { scrollBehavior } from '@ab/web-kit/lib/motion/reduced-motion';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { LessonPanel } from '@ab/web-kit/portal/recordings/LessonPanel';
import { RecordingRowButton } from '@ab/web-kit/portal/recordings/RecordingRowButton';
import { useChildRecordings } from '@ab/web-kit/portal/recordings/use-recordings';

const F = t.lessonFiles;

interface Props {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

const monthName = (month: string): string =>
  dateText(
    new Date(`${month}-01T00:00:00Z`),
    { tz: 'UTC', locale },
    { month: 'long', year: 'numeric' },
  );

/** One row per lesson (the newest part stands for it). */
const firstParts = (rows: readonly PortalRecording[]): PortalRecording[] =>
  rows.filter((r, i, all) => all.findIndex((x) => x.lesson_id === r.lesson_id) === i);

/**
 * A row far down picks a lesson whose card sits above it: the card comes into view (smoothly,
 * unless motion is reduced) so the family sees what changed. A card in view stays still.
 */
function bringIntoView(el: HTMLElement | null): void {
  if (!el || el.getBoundingClientRect().top >= 0) return;
  el.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
}

function List({ data, student, onOpenReport }: Props & { data: PortalRecordings }) {
  const rows = firstParts(data.items);
  const [picked, setPicked] = useState<string | null>(rows[0]?.lesson_id ?? null);
  const card = useRef<HTMLDivElement>(null);
  const playing = useNowPlaying();
  const ids = partIdsByLesson(data.items);
  const marks = hasVideo(data.items);
  if (rows.length === 0) {
    return (
      <EmptyState title={F.empty}>
        {`${F.emptyMeet.replace('{name}', student.name)} ${F.emptyRoom}`}
      </EmptyState>
    );
  }
  const pick = (lessonId: string) => {
    setPicked(lessonId);
    bringIntoView(card.current);
  };
  return (
    <div className="@container grid gap-5">
      <p className="text-sm text-ink-3">{marks ? t.familyFiles.mixedHint : F.recordingsHint}</p>
      <div ref={card} className="scroll-mt-20">
        {picked && (
          <LessonPanel key={picked} student={student} lessonId={picked}
            onOpenReport={onOpenReport} />
        )}
      </div>
      {recordingMonths(rows, student.tz).map(({ month, rows: list }) => (
        <section key={month} aria-label={monthName(month)} className="grid gap-2">
          <SectionHeader title={monthName(month)} level={3} />
          <div className="grid gap-2 @xl:grid-cols-2">
            {list.map((row) => (
              <RecordingRowButton
                key={row.id}
                row={row}
                student={student}
                parts={ids.get(row.lesson_id)?.length ?? 1}
                picked={row.lesson_id === picked}
                playing={ids.get(row.lesson_id)?.some((id) => id === playing) ?? false}
                marks={marks}
                onPick={() => pick(row.lesson_id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** With no lessons yet only the empty note shows, no hint above it. */
export function RecordingsPanel({ student, onOpenReport }: Props) {
  const query = useChildRecordings(student.id);
  return (
    <QueryState query={query}>
      {(data) => <List data={data} student={student} onOpenReport={onOpenReport} />}
    </QueryState>
  );
}

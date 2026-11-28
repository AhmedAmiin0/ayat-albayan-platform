import type { TimeEditMode } from '@ab/schedule';
import type { LessonView } from '@ab/schedule';
import { sameClockAt } from '@ab/time';
import { NuqtaGlyph, t, useClock, useViewerTz } from '@ab/web-kit';
import type { Change } from './edit-time';
import { whenWithLength } from './edit-time-text';
import { durationMin, studentTimes, timeInCity } from '@/features/teaching/schedule/lesson/lessons';

export interface EditTimeConfirmProps {
  lesson: LessonView;
  mode: TimeEditMode;
  /** The picked start (UTC ISO) and length. */
  next: { startsAt: string; durationMin: number };
  change: Change;
  /** A guardian message would be queued (move to a later start in the future). */
  canNotify: boolean;
  notify: boolean;
  onNotify: (on: boolean) => void;
  /** The API refused the length change (approved / paid month): its payout warning no longer applies. */
  payoutLocked?: boolean;
}

function Note({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 text-xs text-ink-2">
      <NuqtaGlyph shape="half" className="mt-1 text-act" />
      <span>{children}</span>
    </p>
  );
}

/** Each side breaks as a unit, so the length never splits across lines. */
const Side = ({ children }: { children: string }) => (
  <span className="whitespace-nowrap">{children}</span>
);

/** Shown once something differs (R-SCH-11); corrections show payout and report effects. */
export function EditTimeConfirm(p: EditTimeConfirmProps) {
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const { lesson, mode, next, change, canNotify, notify, onNotify, payoutLocked = false } = p;
  const teacherTz = lesson.teacher.tz;
  // The teacher's own clock is only worth a line when it reads differently from the viewer's.
  const sameClock = sameClockAt(new Date(next.startsAt), { a: teacherTz, b: tz });
  const clocks = [
    ...(sameClock
      ? []
      : [t.schedule.teacherTime.replace('{time}', timeInCity(next.startsAt, teacherTz, clock))]),
    ...studentTimes({ starts_at: next.startsAt, students: lesson.students }, tz, clock),
  ];
  const correct = mode === 'correct';
  const sides = {
    '{from}': whenWithLength(lesson.starts_at, durationMin(lesson), clock),
    '{to}': whenWithLength(next.startsAt, next.durationMin, clock),
  };
  return (
    <div className="grid gap-2.5 rounded-md bg-sunk px-3.5 py-3" aria-live="polite">
      <p className="text-sm font-semibold">
        {t.lessons.timeEdit.confirmLine.split(/(\{from\}|\{to\})/).map((part, i) => {
          const side = sides[part as keyof typeof sides];
          return side ? <Side key={i}>{side}</Side> : part;
        })}
        <span className="ms-1.5 text-xs font-normal text-ink-3">{t.schedule.viewerTime}</span>
      </p>
      {clocks.map((line, i) => (
        <p key={`${i}-${line}`} className="text-xs text-ink-2">
          {line}
        </p>
      ))}
      <p className="text-xs text-ink-3">{t.lessons.timeEdit.sameLesson}</p>
      {correct && <Note>{t.lessons.timeEdit.heldNote}</Note>}
      {correct && change.duration && !payoutLocked && <Note>{t.lessons.timeEdit.payoutWarn}</Note>}
      {correct && <Note>{t.lessons.timeEdit.pdfRefresh}</Note>}
      {canNotify && (
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => onNotify(e.target.checked)}
            className="size-4 accent-[var(--lapis)]"
          />
          <span>{t.lessons.timeEdit.notify}</span>
        </label>
      )}
    </div>
  );
}

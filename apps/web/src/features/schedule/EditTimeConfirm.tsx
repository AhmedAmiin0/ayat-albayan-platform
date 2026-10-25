import { clockTime, type LessonView } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import type { Change } from './edit-time';
import { whenWithLength } from './edit-time-text';
import type { TimeEditMode } from './edit-time.contract';
import { durationMin, studentTimes, timeInCity } from './lessons';
import { RIYADH_TZ } from './tz';

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

/** Each side of «قبل ← بعد» breaks as a unit, so «(60 دقيقة)» never splits across lines. */
const Side = ({ children }: { children: string }) => <span className="whitespace-nowrap">{children}</span>;

/**
 * What saving does, before the admin presses it (R-SCH-11): «قبل ← بعد» in Riyadh time with the
 * teacher's and students' clocks, that it is the same lesson, and for a correction the effects on
 * the teacher's payout and the report file. Shown once something differs.
 */
export function EditTimeConfirm(p: EditTimeConfirmProps) {
  const { lesson, mode, next, change, canNotify, notify, onNotify, payoutLocked = false } = p;
  const teacherTz = lesson.teacher.tz;
  // The teacher's own clock is only worth a line when it reads differently from Riyadh's.
  const sameClock = clockTime(new Date(next.startsAt), teacherTz) === clockTime(new Date(next.startsAt), RIYADH_TZ);
  const clocks = [
    ...(sameClock ? [] : [t.schedule.teacherTime.replace('{time}', timeInCity(next.startsAt, teacherTz))]),
    ...studentTimes({ starts_at: next.startsAt, students: lesson.students }, RIYADH_TZ),
  ];
  const correct = mode === 'correct';
  const sides = { '{from}': whenWithLength(lesson.starts_at, durationMin(lesson)), '{to}': whenWithLength(next.startsAt, next.durationMin) };
  return (
    <div className="grid gap-2.5 rounded-md bg-sunk px-3.5 py-3" aria-live="polite">
      <p className="text-sm font-semibold">
        {t.lessons.timeEdit.confirmLine.split(/(\{from\}|\{to\})/).map((part, i) => {
          const side = sides[part as keyof typeof sides];
          return side ? <Side key={i}>{side}</Side> : part;
        })}
        <span className="ms-1.5 text-xs font-normal text-ink-3">{t.schedule.riyadhTime}</span>
      </p>
      {clocks.map((line, i) => (
        <p key={`${i}-${line}`} className="text-xs text-ink-2">{line}</p>
      ))}
      <p className="text-xs text-ink-3">{t.lessons.timeEdit.sameLesson}</p>
      {correct && <Note>{t.lessons.timeEdit.heldNote}</Note>}
      {correct && change.duration && !payoutLocked && <Note>{t.lessons.timeEdit.payoutWarn}</Note>}
      {correct && <Note>{t.lessons.timeEdit.pdfRefresh}</Note>}
      {canNotify && (
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
          <input type="checkbox" checked={notify} onChange={(e) => onNotify(e.target.checked)} className="size-4 accent-[var(--lapis)]" />
          <span>{t.lessons.timeEdit.notify}</span>
        </label>
      )}
    </div>
  );
}

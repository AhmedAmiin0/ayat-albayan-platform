import { lessonWhenText, type LessonView } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import type { Change } from './edit-time';
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
}

const duration: Record<string, string> = t.enums.duration;
const when = (iso: string, mins: number) =>
  `${lessonWhenText(new Date(iso), RIYADH_TZ, locale)} (${duration[String(mins)] ?? mins})`;

function Note({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 text-xs text-ink-2">
      <NuqtaGlyph shape="half" className="mt-1 text-act" />
      <span>{children}</span>
    </p>
  );
}

/**
 * What saving does, before the admin presses it (R-SCH-11): «قبل ← بعد» in Riyadh time with the
 * teacher's and students' clocks, that it is the same lesson, and for a correction the effects on
 * the teacher's payout and the report file. Shown once something differs.
 */
export function EditTimeConfirm({ lesson, mode, next, change, canNotify, notify, onNotify }: EditTimeConfirmProps) {
  const teacherTz = lesson.teacher.tz;
  const clocks = [
    ...(teacherTz === RIYADH_TZ ? [] : [t.schedule.teacherTime.replace('{time}', timeInCity(next.startsAt, teacherTz))]),
    ...studentTimes({ starts_at: next.startsAt, students: lesson.students }, RIYADH_TZ),
  ];
  const correct = mode === 'correct';
  return (
    <div className="grid gap-2.5 rounded-md bg-sunk px-3.5 py-3" aria-live="polite">
      <p className="text-sm font-semibold">
        {t.lessons.timeEdit.confirmLine
          .replace('{from}', when(lesson.starts_at, durationMin(lesson)))
          .replace('{to}', when(next.startsAt, next.durationMin))}
        <span className="ms-1.5 text-xs font-normal text-ink-3">{t.schedule.riyadhTime}</span>
      </p>
      {clocks.map((line, i) => (
        <p key={`${i}-${line}`} className="text-xs text-ink-2">{line}</p>
      ))}
      <p className="text-xs text-ink-3">{t.lessons.timeEdit.sameLesson}</p>
      {correct && <Note>{t.lessons.timeEdit.heldNote}</Note>}
      {correct && change.duration && <Note>{t.lessons.timeEdit.payoutWarn}</Note>}
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

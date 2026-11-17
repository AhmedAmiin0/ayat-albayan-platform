import { listenState, listenText } from '@ab/client-core';
import type { PortalRecording, PortalStudent } from '@ab/shared';
import { useResumeMap } from '@/features/teaching/lesson-files';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { lessonTitle, rowLine } from './lesson-words';

interface Props {
  row: PortalRecording;
  student: PortalStudent;
  parts: number;
  picked: boolean;
  onPick: () => void;
}

/**
 * One lesson of «كل التسجيلات»: «حلقة الأحد 15 نوفمبر», «مع مريم · 17:00 · 44 دقيقة · جزءان»,
 * where the listener stopped. A plain grid button of spans: it wraps at phone width.
 */
export function RecordingRowButton({ row, student, parts, picked, onPick }: Props) {
  const clock = { ...useClock(), tz: student.tz };
  const heard = listenText(listenState(useResumeMap(), row.id), t.lessonFiles);
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className="grid w-full min-w-0 gap-0.5 rounded-md border border-rule bg-raised p-3 text-start hover:bg-sunk aria-pressed:border-primary aria-pressed:bg-lapis-wash"
    >
      <span className="text-sm font-semibold text-ink">{lessonTitle(row.lesson_starts_at, clock)}</span>
      <span className="text-xs text-ink-2">{rowLine(row, { parts, clock })}</span>
      <span className="text-xs text-ink-3">{heard}</span>
    </button>
  );
}

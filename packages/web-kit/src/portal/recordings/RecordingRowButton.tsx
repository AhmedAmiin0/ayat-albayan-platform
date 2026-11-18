import { listenState, listenText } from '@ab/client-core';
import type { PortalRecording, PortalStudent } from '@ab/shared';
import { DateTile } from '@ab/web-kit/components/family/panels/DateTile';
import { PlayGlyph } from '@ab/web-kit/components/family/panels/PlayGlyph';
import { useResumeMap } from '@ab/web-kit/lesson-files/use-resume';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
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
 * where the listener stopped. A plain grid button of spans: it wraps at phone width. The family
 * look (board PortalWebRecordings): the date tile, the words, a mint play disc; gold once picked.
 */
export function RecordingRowButton({ row, student, parts, picked, onPick }: Props) {
  const clock = { ...useClock(), tz: student.tz };
  const heard = listenText(listenState(useResumeMap(), row.id), t.lessonFiles);
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className="grid w-full min-w-0 gap-0.5 rounded-md border border-rule bg-raised p-3 text-start hover:bg-sunk aria-pressed:border-primary aria-pressed:bg-lapis-wash family:flex family:min-h-[76px] family:items-center family:gap-3.5 family:rounded-[18px] family:px-4 family:py-2 family:aria-pressed:border-gold family:aria-pressed:bg-[#fbf1d6] family:dark:aria-pressed:bg-gold-wash"
    >
      <DateTile at={row.lesson_starts_at} tz={student.tz} />
      <span className="contents family:grid family:min-w-0 family:flex-1 family:gap-0.5">
        <span className="text-sm font-semibold text-ink family:text-body family:font-extrabold">
          {lessonTitle(row.lesson_starts_at, clock)}
        </span>
        <span className="text-xs text-ink-2 family:text-[13px] family:text-ink-3">
          {rowLine(row, { parts, clock })}
        </span>
        <span className="text-xs text-ink-3">{heard}</span>
      </span>
      <span
        aria-hidden="true"
        className="hidden size-11 shrink-0 place-items-center rounded-full bg-lapis-wash text-lapis
          family:grid"
      >
        <PlayGlyph />
      </span>
    </button>
  );
}

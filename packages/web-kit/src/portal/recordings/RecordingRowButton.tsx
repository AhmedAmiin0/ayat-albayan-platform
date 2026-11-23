import { listenState, listenText, type ListenState } from '@ab/client-core';
import type { PortalRecording, PortalStudent } from '@ab/shared';
import { Pill } from '#/components/ui/surface/index.ts';
import { useResumeMap } from '#/lesson-files/index.ts';
import { useClock } from '#/lib/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { lessonTitle, rowLine } from './lesson-words';

const FF = t.familyFiles;

interface Props {
  row: PortalRecording;
  student: PortalStudent;
  parts: number;
  picked: boolean;
  /** One of the lesson's parts sounds now. */
  playing: boolean;
  /** Some rows are video: each row then says «مرئي» or «صوتي». */
  marks: boolean;
  onPick: () => void;
}

/** «مرئي» / «صوتي», and a watched video reads «شاهدته كاملًا». */
const MEDIA: Record<PortalRecording['media'], { mark: string; heard: string }> = {
  audio: { mark: FF.audioMark, heard: t.lessonFiles.heard },
  video: { mark: FF.videoMark, heard: FF.watched },
};

/** Where the listener stopped; a lesson never heard is a «جديد» pill. */
function Heard({ state, heard }: { state: ListenState; heard: string }) {
  const text = listenText(state, { ...t.lessonFiles, heard });
  if (state.kind === 'new') return <Pill tone="act">{text}</Pill>;
  return <span className="text-xs text-ink-3">{text}</span>;
}

/** The live mark of the row that sounds («قيد التشغيل»): the one loop, a breathing dot. */
function PlayingMark() {
  return (
    <span className="inline-flex animate-fade-in items-center gap-1.5 text-xs font-semibold text-lapis">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-lapis" />
      {FF.playing}
    </span>
  );
}

/**
 * One lesson of «التسجيلات»: «حلقة الأحد 15 نوفمبر», «مع مريم · 17:00 · 44 دقيقة · جزءان», and
 * at the end where the listener stopped (or «قيد التشغيل»). A grid button of spans: it wraps.
 */
export function RecordingRowButton({ row, student, parts, picked, playing, marks, onPick }: Props) {
  const clock = { ...useClock(), tz: student.tz };
  const media = MEDIA[row.media];
  const heard = listenState(useResumeMap(), row.id);
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className="ab-press grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3
        gap-y-1 rounded-md border border-rule bg-raised p-4 text-start hover:bg-sunk
        aria-pressed:border-lapis aria-pressed:bg-lapis-wash aria-pressed:ring-1
        aria-pressed:ring-inset aria-pressed:ring-lapis"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">{lessonTitle(row.lesson_starts_at, clock)}</span>
        {marks && <Pill tone="neutral">{media.mark}</Pill>}
      </span>
      <span className="row-span-2 grid justify-items-end gap-1">
        {playing && <PlayingMark />}
        <Heard state={heard} heard={media.heard} />
      </span>
      <span className="text-xs text-ink-2">{rowLine(row, { parts, clock })}</span>
    </button>
  );
}

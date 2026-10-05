import type { StudentRecordingView, UserRole } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { recordingTime, RECORDING_TONE } from '@/features/classroom/recordings/recording-format';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { durationText, sizeText } from './recording-format';
import { RecordingDelete } from './RecordingDelete';
import { RecordingPlayer } from './RecordingPlayer';
import { RecordingVisibility } from './RecordingVisibility';

const R = t.studentRecordings;
const TONE = { ...RECORDING_TONE, deleted: 'neutral' } as const;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-ink-2 tabular-nums">{value}</dd>
    </div>
  );
}

/** One recording: when, who taught, length, size, status, the player, and the staff controls. */
export function StudentRecordingRow({ rec, role }: { rec: StudentRecordingView; role: UserRole }) {
  const when = recordingTime(rec.lesson_starts_at);
  return (
    <li id={`recording-${rec.lesson_id}`} className="grid gap-3 border-b border-rule py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 font-semibold">{R.lessonAt.replace('{when}', when)}</span>
        <StatusChip tone={TONE[rec.status]} label={R.status[rec.status]} size="sm" />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Fact label={R.teacher} value={rec.teacher ? teacherLabel(rec.teacher) : R.unknown} />
        <Fact label={R.duration} value={durationText(rec.duration_seconds)} />
        <Fact label={R.size} value={sizeText(rec.size_bytes)} />
      </dl>
      <RecordingPlayer rec={rec} when={when} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RecordingVisibility rec={rec} />
        {role === 'admin' && rec.status !== 'deleted' && rec.status !== 'recording' && <RecordingDelete id={rec.id} />}
      </div>
    </li>
  );
}

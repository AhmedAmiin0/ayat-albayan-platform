import type { LessonRecordingView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { StatusChip } from '@/components/ui/display/status-chip';
import { buttonVariants } from '@/components/ui/form/button';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { t } from '@/lib/i18n/i18n';
import { recordingsQuery, recordingStatusQuery, type RecordingSource } from '@/features/teaching/classroom/api/moderation-api';
import { RECORDING_TONE, recordingTime } from './recording-format';
import { useClock } from '@/lib/clock';

const R = t.classroom.recordings;

function Row({ rec }: { rec: LessonRecordingView }) {
  const time = recordingTime(rec.started_at, useClock());
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 last:border-b-0">
      <span className="min-w-0 flex-1 font-semibold">{time}</span>
      <StatusChip tone={RECORDING_TONE[rec.status]} label={R.status[rec.status]} size="sm" />
      {rec.url && (
        <a
          href={rec.url}
          download
          target="_blank"
          rel="noreferrer"
          aria-label={R.downloadOf.replace('{time}', time)}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <Icon name="download" />
          {R.download}
        </a>
      )}
    </li>
  );
}

/** «التسجيل غير مفعّل على الخادم»: the server says it cannot record (nothing would show up here). */
export function RecordingOffAlert() {
  return (
    <FormAlert>
      <strong>{R.notConfigured}</strong> {R.notConfiguredHint}
    </FormAlert>
  );
}

function List({ source }: { source: RecordingSource }) {
  const q = useQuery({ ...recordingsQuery(source), refetchInterval: 30_000 });
  if (q.isPending) return <p role="status" className="text-sm text-ink-2">{R.loading}</p>;
  if (q.isError) return <FormAlert>{R.error}</FormAlert>;
  if (q.data.length === 0) return <p className="text-sm text-ink-2">{source.kind === 'meeting' ? R.emptyMeeting : R.empty}</p>;
  return (
    <ul aria-label={R.title}>
      {q.data.map((rec) => (
        <Row key={rec.id} rec={rec} />
      ))}
    </ul>
  );
}

function Body({ source }: { source: RecordingSource }) {
  const status = useQuery(recordingStatusQuery);
  return (
    <div className="grid gap-3">
      {status.data?.configured === false && <RecordingOffAlert />}
      <List source={source} />
    </div>
  );
}

/** «التسجيلات» of a lesson (admin, teacher) or a meeting (admin, creator): status, start time, download. */
export function RecordingsPanel({ source, onClose }: { source: RecordingSource; onClose: () => void }) {
  return (
    <Drawer title={R.title} onClose={onClose}>
      <Body source={source} />
    </Drawer>
  );
}

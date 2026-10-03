import type { LessonRecordingView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { StatusChip } from '@/components/ui/status-chip';
import { buttonVariants } from '@/components/ui/button';
import { Drawer } from '@/features/schedule/Drawer';
import { t } from '@/lib/i18n';
import { recordingsQuery } from '../moderation-api';
import { RECORDING_TONE, recordingTime } from './recording-format';

function Row({ rec }: { rec: LessonRecordingView }) {
  const time = recordingTime(rec.started_at);
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 last:border-b-0">
      <span className="min-w-0 flex-1 font-semibold">{time}</span>
      <StatusChip tone={RECORDING_TONE[rec.status]} label={t.classroom.recordings.status[rec.status]} size="sm" />
      {rec.url && (
        <a
          href={rec.url}
          download
          target="_blank"
          rel="noreferrer"
          aria-label={t.classroom.recordings.downloadOf.replace('{time}', time)}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <Icon name="download" />
          {t.classroom.recordings.download}
        </a>
      )}
    </li>
  );
}

function Body({ lessonId }: { lessonId: string }) {
  const q = useQuery({ ...recordingsQuery(lessonId), refetchInterval: 30_000 });
  if (q.isPending) return <p role="status" className="text-sm text-ink-2">{t.classroom.recordings.loading}</p>;
  if (q.isError) return <FormAlert>{t.classroom.recordings.error}</FormAlert>;
  if (q.data.length === 0) return <p className="text-sm text-ink-2">{t.classroom.recordings.empty}</p>;
  return (
    <ul aria-label={t.classroom.recordings.title}>
      {q.data.map((rec) => (
        <Row key={rec.id} rec={rec} />
      ))}
    </ul>
  );
}

/** «التسجيلات» of this lesson (admin, teacher): status, start in the viewer's zone, download link. */
export function RecordingsPanel({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  return (
    <Drawer title={t.classroom.recordings.title} onClose={onClose}>
      <Body lessonId={lessonId} />
    </Drawer>
  );
}

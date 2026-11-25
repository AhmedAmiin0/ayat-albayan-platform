import type { LessonAssetRecording } from '@ab/shared';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { recordingLine } from '@ab/web-kit/lesson-files/file-words';
import { AudioPlayer } from '@ab/web-kit/lesson-files/AudioPlayer';
import { useRecordingVisibility } from './use-lesson-files';
import { VisibleBox } from './VisibleBox';

const R = t.studentRecordings;

interface Props {
  rec: LessonAssetRecording;
  /** More than one student: the file is every student's session and stays hidden. */
  group: boolean;
}

export function RecordingItem({ rec, group }: Props) {
  const toggle = useRecordingVisibility();
  return (
    <div className="grid gap-2">
      <p className="text-sm">
        <span className="font-semibold">{t.lessonFiles.recording}</span>
        {' · '}
        {R.status[rec.status]}
        {recordingLine(rec) && <span className="text-ink-3"> · {recordingLine(rec)}</span>}
      </p>
      {rec.url && <AudioPlayer id={rec.id} url={rec.url} label={t.lessonFiles.recording} />}
      {rec.status === 'done' && (
        <VisibleBox
          checked={rec.visible_to_student}
          disabled={group || toggle.isPending}
          onChange={(visible) => toggle.mutate({ id: rec.id, visible })}
        />
      )}
      {group && rec.status === 'done' && <p className="text-xs text-ink-3">{R.visible.groupLesson}</p>}
      {toggle.isError && <FormAlert>{R.visible.failed}</FormAlert>}
    </div>
  );
}

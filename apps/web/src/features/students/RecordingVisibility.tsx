import type { StudentRecordingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { RECORDINGS_KEY, setRecordingVisible } from './recordings-api';

const R = t.studentRecordings.visible;

/** A group lesson's file cannot be shown to one student: the API says so with this code. */
const isGroupRefusal = (e: unknown): boolean =>
  e instanceof ApiError && e.status === 409 && (e.body as { code?: string } | null)?.code === 'recording_group_lesson';

/**
 * «إظهار للطالب» (off by default): the admin and the lesson's teacher decide whether the student
 * and guardian may watch it once their portal exists. Everyone else just reads the state.
 */
export function RecordingVisibility({ rec }: { rec: StudentRecordingView }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: setRecordingVisible,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECORDINGS_KEY }),
  });
  if (rec.status === 'deleted') return null;
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rec.visible_to_student}
          disabled={!rec.can_manage || toggle.isPending}
          onChange={(e) => toggle.mutate({ id: rec.id, visible: e.target.checked })}
          className="size-4 accent-[var(--lapis)]"
        />
        <span className="font-semibold">{R.label}</span>
      </label>
      <p className="text-xs text-ink-3">{rec.visible_to_student ? R.on : R.off}</p>
      {toggle.isError && <FormAlert>{isGroupRefusal(toggle.error) ? R.groupLesson : R.failed}</FormAlert>}
    </div>
  );
}
